import {
  readProjectCanvasFile,
  trashProjectCanvasFile,
  writeProjectCanvasFile,
} from "../../../services/tauri";
import type {
  IntentCanvasDocument,
  IntentCanvasIndexEntry,
  IntentCanvasIndexFile,
  IntentCanvasLinks,
  IntentCanvasLoadResult,
  IntentCanvasMode,
  IntentCanvasOpenRequest,
  IntentCanvasWorkspaceRef,
} from "../types";
import { asString, asStringArray, isRecord } from "../utils/json";
import {
  buildIntentCanvasAiContext,
  createInitialIntentCanvasScene,
  sanitizeIntentCanvasScene,
} from "../utils/scene";

export const INTENT_CANVAS_INDEX_PATH = "index.json";
const CANVAS_ID_PATTERN = /^canvas-[A-Za-z0-9._-]+$/;

function normalizeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isMissingFileError(error: unknown): boolean {
  const message = normalizeErrorMessage(error).toLowerCase();
  return message.includes("not found") || message.includes("no such file") || message.includes("does not exist");
}

function createCanvasId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `canvas-${crypto.randomUUID()}`;
  }
  return `canvas-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeCanvasId(value: unknown): string | null {
  const canvasId = asString(value);
  if (!canvasId || !CANVAS_ID_PATTERN.test(canvasId)) {
    return null;
  }
  if (
    canvasId.includes("..") ||
    canvasId.includes("/") ||
    canvasId.includes("\\") ||
    canvasId.includes(":")
  ) {
    return null;
  }
  return canvasId;
}

function resolveDocumentPath(canvasId: string): string {
  const safeCanvasId = normalizeCanvasId(canvasId);
  if (!safeCanvasId) {
    throw new Error(`Invalid Intent Canvas id: ${canvasId}`);
  }
  return `${safeCanvasId}.intent-canvas.json`;
}

function normalizeMode(value: unknown): IntentCanvasMode {
  return value === "spotlight" || value === "file" ? value : "architect";
}

function normalizeLinks(value: unknown): IntentCanvasLinks {
  if (!isRecord(value)) {
    return { projectMapNodeIds: [], filePaths: [], threadIds: [] };
  }
  return {
    projectMapNodeIds: asStringArray(value.projectMapNodeIds),
    filePaths: asStringArray(value.filePaths),
    threadIds: asStringArray(value.threadIds),
  };
}

function buildIndexEntry(document: IntentCanvasDocument): IntentCanvasIndexEntry {
  const safeCanvasId = normalizeCanvasId(document.id);
  if (!safeCanvasId) {
    throw new Error(`Invalid Intent Canvas id: ${document.id}`);
  }
  return {
    id: safeCanvasId,
    title: document.title,
    mode: document.mode,
    summary: document.summary,
    updatedAt: document.updatedAt,
    createdAt: document.createdAt,
    path: resolveDocumentPath(safeCanvasId),
    linkedFileCount: document.links.filePaths.length,
    linkedProjectMapNodeCount: document.links.projectMapNodeIds.length,
    linkedThreadCount: document.links.threadIds.length,
    elementCount: document.scene.elements.filter((element) => !element.isDeleted).length,
  };
}

function normalizeCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

function normalizeIndexEntry(value: unknown): IntentCanvasIndexEntry | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = normalizeCanvasId(value.id);
  const title = asString(value.title);
  const updatedAt = asString(value.updatedAt);
  const createdAt = asString(value.createdAt) ?? updatedAt;
  if (!id || !title || !updatedAt || !createdAt) {
    return null;
  }
  return {
    id,
    title,
    path: resolveDocumentPath(id),
    updatedAt,
    createdAt,
    mode: normalizeMode(value.mode),
    summary: asString(value.summary) ?? "",
    linkedFileCount: normalizeCount(value.linkedFileCount),
    linkedProjectMapNodeCount: normalizeCount(value.linkedProjectMapNodeCount),
    linkedThreadCount: normalizeCount(value.linkedThreadCount),
    elementCount: normalizeCount(value.elementCount),
  };
}

function normalizeIndexFile(value: unknown): IntentCanvasIndexFile {
  if (!isRecord(value) || !Array.isArray(value.canvases)) {
    return { version: 1, canvases: [] };
  }
  return {
    version: 1,
    canvases: value.canvases.flatMap((entry) => {
      const normalized = normalizeIndexEntry(entry);
      return normalized ? [normalized] : [];
    }),
  };
}

export function normalizeIntentCanvasDocument(value: unknown): IntentCanvasDocument | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = normalizeCanvasId(value.id);
  const title = asString(value.title);
  const createdAt = asString(value.createdAt);
  const updatedAt = asString(value.updatedAt);
  const workspace = isRecord(value.workspace) ? value.workspace : null;
  const workspaceId = asString(workspace?.id);
  if (!id || !title || !createdAt || !updatedAt || !workspaceId || value.kind !== "intent-canvas") {
    return null;
  }
  const links = normalizeLinks(value.links);
  const scene = isRecord(value.scene)
    ? sanitizeIntentCanvasScene(
        Array.isArray(value.scene.elements) ? value.scene.elements : [],
        isRecord(value.scene.appState) ? value.scene.appState : {},
        isRecord(value.scene.files) ? value.scene.files : {},
      )
    : createInitialIntentCanvasScene(null);
  const summary = asString(value.summary) ?? "";
  return {
    version: 1,
    id,
    title,
    kind: "intent-canvas",
    createdAt,
    updatedAt,
    workspace: {
      id: workspaceId,
      name: asString(workspace?.name),
    },
    mode: normalizeMode(value.mode),
    summary,
    links,
    scene,
    aiContext: buildIntentCanvasAiContext(scene, summary),
  };
}

export async function loadIntentCanvasIndex(
  workspaceId: string,
): Promise<IntentCanvasLoadResult<IntentCanvasIndexEntry[]>> {
  try {
    const response = await readProjectCanvasFile(workspaceId, INTENT_CANVAS_INDEX_PATH);
    const parsed = JSON.parse(response.content) as unknown;
    const indexFile = normalizeIndexFile(parsed);
    return {
      value: indexFile.canvases.slice().sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
      warnings: [],
    };
  } catch (error) {
    if (isMissingFileError(error)) {
      return { value: [], warnings: [] };
    }
    return {
      value: [],
      warnings: [`Failed to load Intent Canvas index: ${normalizeErrorMessage(error)}`],
    };
  }
}

export async function loadIntentCanvasDocument(
  workspaceId: string,
  canvasId: string,
): Promise<IntentCanvasDocument> {
  const response = await readProjectCanvasFile(workspaceId, resolveDocumentPath(canvasId));
  const parsed = JSON.parse(response.content) as unknown;
  const document = normalizeIntentCanvasDocument(parsed);
  if (!document) {
    throw new Error(`Invalid Intent Canvas document: ${canvasId}`);
  }
  return document;
}

async function writeIndex(workspaceId: string, entries: IntentCanvasIndexEntry[]): Promise<void> {
  const indexFile: IntentCanvasIndexFile = {
    version: 1,
    canvases: entries.slice().sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
  };
  await writeProjectCanvasFile(workspaceId, INTENT_CANVAS_INDEX_PATH, JSON.stringify(indexFile, null, 2));
}

export async function saveIntentCanvasDocument(
  workspaceId: string,
  document: IntentCanvasDocument,
): Promise<IntentCanvasDocument> {
  const now = new Date().toISOString();
  const nextDocument: IntentCanvasDocument = {
    ...document,
    updatedAt: now,
    aiContext: buildIntentCanvasAiContext(document.scene, document.summary),
  };
  await writeProjectCanvasFile(
    workspaceId,
    resolveDocumentPath(nextDocument.id),
    JSON.stringify(nextDocument, null, 2),
  );
  const indexResult = await loadIntentCanvasIndex(workspaceId);
  const nextEntry = buildIndexEntry(nextDocument);
  const nextEntries = [
    nextEntry,
    ...indexResult.value.filter((entry) => entry.id !== nextDocument.id),
  ];
  await writeIndex(workspaceId, nextEntries);
  return nextDocument;
}

export async function deleteIntentCanvasDocument(
  workspaceId: string,
  canvasId: string,
): Promise<void> {
  const indexResult = await loadIntentCanvasIndex(workspaceId);
  try {
    await trashProjectCanvasFile(workspaceId, resolveDocumentPath(canvasId));
  } catch (error) {
    if (!isMissingFileError(error)) {
      throw error;
    }
  }
  await writeIndex(workspaceId, indexResult.value.filter((entry) => entry.id !== canvasId));
}

export function createIntentCanvasDocument(input: {
  workspace: IntentCanvasWorkspaceRef;
  request?: IntentCanvasOpenRequest | null;
}): IntentCanvasDocument {
  const now = new Date().toISOString();
  const id = createCanvasId();
  const source = input.request?.source ?? null;
  const title =
    input.request?.title?.trim() ||
    source?.nodeTitle?.trim() ||
    source?.filePath?.trim() ||
    "Untitled Intent Canvas";
  const summary = input.request?.summary?.trim() || source?.summary?.trim() || "";
  const links: IntentCanvasLinks = {
    projectMapNodeIds: uniqueStrings(source?.projectMapNodeId ? [source.projectMapNodeId] : []),
    filePaths: uniqueStrings(source?.filePath ? [source.filePath] : []),
    threadIds: [],
  };
  const scene = createInitialIntentCanvasScene(source);
  return {
    version: 1,
    id,
    title,
    kind: "intent-canvas",
    createdAt: now,
    updatedAt: now,
    workspace: input.workspace,
    mode: input.request?.mode ?? "architect",
    summary,
    links,
    scene,
    aiContext: buildIntentCanvasAiContext(scene, summary),
  };
}

export function cloneIntentCanvasDocument(input: {
  workspace: IntentCanvasWorkspaceRef;
  source: IntentCanvasDocument;
}): IntentCanvasDocument {
  const now = new Date().toISOString();
  const id = createCanvasId();
  const title = `${input.source.title} Copy`;
  return {
    ...input.source,
    id,
    title,
    createdAt: now,
    updatedAt: now,
    workspace: input.workspace,
  };
}

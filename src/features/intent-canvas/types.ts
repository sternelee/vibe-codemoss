import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";

export type IntentCanvasMode = "architect" | "spotlight" | "file";

export type IntentCanvasWorkspaceRef = {
  id: string;
  name: string | null;
};

export type IntentCanvasOpenSource = {
  projectMapNodeId?: string | null;
  nodeTitle?: string | null;
  nodeKind?: string | null;
  summary?: string | null;
  filePath?: string | null;
};

export type IntentCanvasOpenRequest = {
  requestId: number;
  mode: IntentCanvasMode;
  canvasId?: string | null;
  title?: string | null;
  summary?: string | null;
  source?: IntentCanvasOpenSource | null;
};

export type IntentCanvasElementDigest = {
  id: string;
  type: string;
  label: string | null;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
};

export type IntentCanvasRelationDigest = {
  id: string;
  type: "arrow" | "line";
  label: string | null;
  startBindingId: string | null;
  endBindingId: string | null;
};

export type IntentCanvasAiContext = {
  elementDigest: IntentCanvasElementDigest[];
  relationDigest: IntentCanvasRelationDigest[];
  lastContextSnapshot: string;
};

export type IntentCanvasScene = {
  elements: readonly OrderedExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
};

export type IntentCanvasLinks = {
  projectMapNodeIds: string[];
  filePaths: string[];
  threadIds: string[];
};

export type IntentCanvasDocument = {
  version: 1;
  id: string;
  title: string;
  kind: "intent-canvas";
  createdAt: string;
  updatedAt: string;
  workspace: IntentCanvasWorkspaceRef;
  mode: IntentCanvasMode;
  summary: string;
  links: IntentCanvasLinks;
  scene: IntentCanvasScene;
  aiContext: IntentCanvasAiContext;
};

export type IntentCanvasIndexEntry = {
  id: string;
  title: string;
  mode: IntentCanvasMode;
  summary: string;
  updatedAt: string;
  createdAt: string;
  path: string;
  linkedFileCount: number;
  linkedProjectMapNodeCount: number;
  linkedThreadCount: number;
  elementCount: number;
};

export type IntentCanvasIndexFile = {
  version: 1;
  canvases: IntentCanvasIndexEntry[];
};

export type IntentCanvasLoadResult<T> = {
  value: T;
  warnings: string[];
};

import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";

import type {
  CanvasSemanticGraph,
  CanvasSemanticNode,
  IntentCanvasAiContext,
  IntentCanvasElementDigest,
  IntentCanvasOpenSource,
  IntentCanvasRelationDigest,
  IntentCanvasScene,
} from "../types";
import { isRecord, toJsonObject } from "./json";

type SeedShape = {
  type: "rectangle" | "text" | "arrow";
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  backgroundColor?: string;
  text?: string;
  fontSize?: number;
  containerId?: string | null;
  boundElementIds?: string[];
  startBindingId?: string | null;
  endBindingId?: string | null;
  strokeWidth?: number;
  roughness?: number;
};

type GraphNodePlacement = {
  node: CanvasSemanticNode;
  elementId: string;
  textElementId: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

const EXCALIDRAW_RUNTIME_APP_STATE_KEYS = new Set(["collaborators"]);
const EXCALIDRAW_OBJECT_MAP_APP_STATE_KEYS = new Set(["selectedElementIds", "selectedGroupIds"]);
const GRAPH_NODE_WIDTH = 260;
const GRAPH_NODE_HEIGHT = 92;
const GRAPH_COLUMN_GAP = 340;
const GRAPH_ROW_GAP = 132;

function inferBoundElementType(id: string): "text" | "arrow" {
  return id.startsWith("intent-node-text-") || id.startsWith("intent-edge-label-")
    ? "text"
    : "arrow";
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
}

function readElementLabel(element: Record<string, unknown>): string | null {
  const candidates = [element.text, element.originalText, element.label];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return null;
}

function buildSeedSkeleton(source: IntentCanvasOpenSource | null | undefined): SeedShape[] {
  const nodeTitle = source?.nodeTitle?.trim();
  const filePath = source?.filePath?.trim();
  const summary = source?.summary?.trim();
  if (nodeTitle || filePath) {
    const primaryLabel = nodeTitle || filePath || "Intent Node";
    const secondaryLabel = filePath && nodeTitle ? filePath : summary || "Describe the logic here";
    return [
      {
        type: "rectangle",
        x: 120,
        y: 160,
        width: 260,
        height: 92,
        strokeColor: "#2563eb",
        backgroundColor: "#eff6ff",
      },
      {
        type: "text",
        x: 130,
        y: 188,
        width: 230,
        height: 32,
        text: secondaryLabel,
        fontSize: 16,
        strokeColor: "#475569",
      },
      {
        type: "text",
        x: 130,
        y: 166,
        width: 230,
        height: 30,
        text: primaryLabel,
        fontSize: 22,
        strokeColor: "#1d4ed8",
      },
      {
        type: "arrow",
        x: 420,
        y: 205,
        width: 220,
        height: 0,
        strokeColor: "#0f172a",
      },
      {
        type: "rectangle",
        x: 680,
        y: 160,
        width: 260,
        height: 92,
        strokeColor: "#0f766e",
        backgroundColor: "#ecfdf5",
      },
      {
        type: "text",
        x: 700,
        y: 188,
        width: 220,
        height: 32,
        text: "Next Module",
        fontSize: 22,
        strokeColor: "#0f766e",
      },
    ];
  }

  return [
    {
      type: "rectangle",
      x: 120,
      y: 160,
      width: 260,
      height: 92,
      strokeColor: "#2563eb",
      backgroundColor: "#eff6ff",
    },
    {
      type: "text",
      x: 140,
      y: 188,
      width: 220,
      height: 32,
      text: "Auth Service",
      fontSize: 22,
      strokeColor: "#1d4ed8",
    },
    {
      type: "arrow",
      x: 420,
      y: 205,
      width: 220,
      height: 0,
      strokeColor: "#0f172a",
    },
    {
      type: "rectangle",
      x: 680,
      y: 160,
      width: 260,
      height: 92,
      strokeColor: "#0f766e",
      backgroundColor: "#ecfdf5",
    },
    {
      type: "text",
      x: 700,
      y: 188,
      width: 220,
      height: 32,
      text: "User DB",
      fontSize: 22,
      strokeColor: "#0f766e",
    },
  ];
}

function createSeedShapeId(prefix: string, value: string): string {
  const safeValue = value
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return `intent-${prefix}-${safeValue || "node"}`;
}

function compactCanvasLabel(value: string | null | undefined, fallback: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    return fallback;
  }
  return normalized.length > 44 ? `${normalized.slice(0, 41)}...` : normalized;
}

function getNodePathLabel(node: CanvasSemanticNode): string {
  const anchor = node.sourceAnchor;
  if (anchor?.kind === "relationship-node" || anchor?.kind === "code-symbol") {
    return compactCanvasLabel(anchor.filePath, node.summary ?? "");
  }
  return compactCanvasLabel(node.summary, "");
}

function getNodeRoleLabel(node: CanvasSemanticNode): string {
  const anchor = node.sourceAnchor;
  if (anchor?.kind === "relationship-node") {
    return compactCanvasLabel(anchor.nodeKind, node.kind);
  }
  if (anchor?.kind === "code-symbol") {
    return compactCanvasLabel(anchor.symbolKind, node.kind);
  }
  const roleMatch = node.summary?.match(/role:([^;]+)/);
  return compactCanvasLabel(roleMatch?.[1], node.kind);
}

function getNodePalette(node: CanvasSemanticNode, isCenterNode: boolean): {
  strokeColor: string;
  backgroundColor: string;
  textColor: string;
} {
  if (node.kind === "group") {
    return { strokeColor: "#f59e0b", backgroundColor: "#221a08", textColor: "#fef3c7" };
  }
  if (isCenterNode) {
    return { strokeColor: "#22d3ee", backgroundColor: "#05252c", textColor: "#a5f3fc" };
  }
  const role = getNodeRoleLabel(node).toLowerCase();
  if (role.includes("controller")) {
    return { strokeColor: "#60a5fa", backgroundColor: "#0b1d34", textColor: "#bfdbfe" };
  }
  if (role.includes("service")) {
    return { strokeColor: "#34d399", backgroundColor: "#08261d", textColor: "#bbf7d0" };
  }
  if (role.includes("hook")) {
    return { strokeColor: "#2dd4bf", backgroundColor: "#082f2c", textColor: "#ccfbf1" };
  }
  if (role.includes("test")) {
    return { strokeColor: "#a3e635", backgroundColor: "#1a2607", textColor: "#ecfccb" };
  }
  if (role.includes("config") || role.includes("manifest")) {
    return { strokeColor: "#fbbf24", backgroundColor: "#2b1d05", textColor: "#fef3c7" };
  }
  return { strokeColor: "#94a3b8", backgroundColor: "#111827", textColor: "#e2e8f0" };
}

function getEdgeColor(edge: CanvasSemanticGraph["edges"][number]): string {
  if (edge.relationKind === "omitted") {
    return "#f59e0b";
  }
  if (edge.relationKind === "calls") {
    return "#22d3ee";
  }
  if (edge.relationKind === "imports") {
    return "#2dd4bf";
  }
  if (edge.relationKind === "tested_by") {
    return "#a3e635";
  }
  if (edge.relationKind === "configures") {
    return "#fbbf24";
  }
  return edge.direction === "in" ? "#60a5fa" : "#94a3b8";
}

function getGraphCenterNode(graph: CanvasSemanticGraph): CanvasSemanticNode {
  const centerNodeId = graph.importOptions?.centerNodeId;
  return graph.nodes.find((node) => node.id === centerNodeId)
    ?? graph.nodes.find((node) => node.summary?.includes("depth:0"))
    ?? graph.nodes[0]!;
}

function createGraphNodeShape(
  node: CanvasSemanticNode,
  placement: GraphNodePlacement,
  isCenterNode: boolean,
  boundArrowIds: string[],
): SeedShape[] {
  const palette = getNodePalette(node, isCenterNode);
  const title = compactCanvasLabel(node.label, "Relationship Node");
  const subtitle = getNodePathLabel(node);
  const roleLabel = getNodeRoleLabel(node);
  const nodeText = [
    title,
    roleLabel ? `${roleLabel} · ${node.kind}` : node.kind,
    subtitle,
  ].filter(Boolean).join("\n");
  return [
    {
      type: "rectangle",
      id: placement.elementId,
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
      strokeColor: palette.strokeColor,
      backgroundColor: palette.backgroundColor,
      boundElementIds: [placement.textElementId, ...boundArrowIds],
      strokeWidth: isCenterNode ? 3 : 2,
      roughness: 0,
    },
    {
      type: "text",
      id: placement.textElementId,
      x: placement.x + 14,
      y: placement.y + 16,
      width: placement.width - 28,
      height: placement.height - 28,
      text: nodeText,
      fontSize: isCenterNode ? 16 : 15,
      strokeColor: palette.textColor,
      containerId: placement.elementId,
    },
  ];
}

function createGraphEdgeShapes(
  graph: CanvasSemanticGraph,
  placements: Map<string, GraphNodePlacement>,
): SeedShape[] {
  const shapes: SeedShape[] = [];
  graph.edges.forEach((edge) => {
    const source = placements.get(edge.sourceNodeId);
    const target = placements.get(edge.targetNodeId);
    if (!source || !target) {
      return;
    }
    const sourceCenterX = source.x + source.width / 2;
    const sourceCenterY = source.y + source.height / 2;
    const targetCenterX = target.x + target.width / 2;
    const targetCenterY = target.y + target.height / 2;
    const arrowId = createSeedShapeId("edge", edge.id);
    const labelId = createSeedShapeId("edge-label", `${edge.id}-${edge.label ?? edge.relationKind}`);
    const edgeColor = getEdgeColor(edge);
    shapes.push({
      type: "arrow",
      id: arrowId,
      x: sourceCenterX,
      y: sourceCenterY,
      width: targetCenterX - sourceCenterX,
      height: targetCenterY - sourceCenterY,
      strokeColor: edgeColor,
      startBindingId: source.elementId,
      endBindingId: target.elementId,
      boundElementIds: [labelId],
      strokeWidth: edge.relationKind === "calls" ? 3 : 2,
      roughness: 0,
    });
    shapes.push({
      type: "text",
      id: labelId,
      x: (sourceCenterX + targetCenterX) / 2 - 90,
      y: (sourceCenterY + targetCenterY) / 2 - 22,
      width: 180,
      height: 22,
      text: compactCanvasLabel(edge.label, edge.relationKind || "relation"),
      fontSize: 12,
      strokeColor: edgeColor,
      containerId: arrowId,
    });
  });
  return shapes;
}

function buildGraphSeedSkeleton(seedSemanticGraphs: CanvasSemanticGraph[] | undefined): SeedShape[] {
  const graph = seedSemanticGraphs?.find((candidate) => candidate.nodes.length > 0);
  if (!graph) {
    return [];
  }
  const centerNode = getGraphCenterNode(graph);
  const incomingIds = new Set(
    graph.edges
      .filter((edge) => edge.targetNodeId === centerNode.id && edge.sourceNodeId !== centerNode.id)
      .map((edge) => edge.sourceNodeId),
  );
  const outgoingIds = new Set(
    graph.edges
      .filter((edge) => edge.sourceNodeId === centerNode.id && edge.targetNodeId !== centerNode.id)
      .map((edge) => edge.targetNodeId),
  );
  const incomingNodes = graph.nodes.filter((node) => incomingIds.has(node.id));
  const outgoingNodes = graph.nodes.filter((node) => outgoingIds.has(node.id));
  const secondaryNodes = graph.nodes.filter((node) => (
    node.id !== centerNode.id && !incomingIds.has(node.id) && !outgoingIds.has(node.id)
  ));
  const maxLaneRows = Math.max(incomingNodes.length, outgoingNodes.length, 1);
  const centerY = 170 + Math.max(0, maxLaneRows - 1) * GRAPH_ROW_GAP / 2;
  const placements = new Map<string, GraphNodePlacement>();
  const placeNode = (node: CanvasSemanticNode, x: number, y: number) => {
    placements.set(node.id, {
      node,
      elementId: createSeedShapeId("node", node.id),
      textElementId: createSeedShapeId("node-text", node.id),
      x,
      y,
      width: GRAPH_NODE_WIDTH,
      height: GRAPH_NODE_HEIGHT,
    });
  };
  incomingNodes.forEach((node, index) => placeNode(node, 80, 130 + index * GRAPH_ROW_GAP));
  placeNode(centerNode, 80 + GRAPH_COLUMN_GAP, centerY);
  outgoingNodes.forEach((node, index) => {
    const lane = index % 2;
    const row = Math.floor(index / 2);
    placeNode(node, 80 + GRAPH_COLUMN_GAP * 2 + lane * 300, 130 + row * GRAPH_ROW_GAP);
  });
  secondaryNodes.forEach((node, index) => {
    placeNode(node, 80 + GRAPH_COLUMN_GAP + (index % 2) * GRAPH_COLUMN_GAP, centerY + 190 + Math.floor(index / 2) * GRAPH_ROW_GAP);
  });
  const boundArrowIdsByNodeId = new Map<string, string[]>();
  graph.edges.forEach((edge) => {
    const arrowId = createSeedShapeId("edge", edge.id);
    const sourceArrowIds = boundArrowIdsByNodeId.get(edge.sourceNodeId) ?? [];
    const targetArrowIds = boundArrowIdsByNodeId.get(edge.targetNodeId) ?? [];
    sourceArrowIds.push(arrowId);
    targetArrowIds.push(arrowId);
    boundArrowIdsByNodeId.set(edge.sourceNodeId, sourceArrowIds);
    boundArrowIdsByNodeId.set(edge.targetNodeId, targetArrowIds);
  });
  const nodeShapes = Array.from(placements.values()).flatMap((placement) => (
    createGraphNodeShape(
      placement.node,
      placement,
      placement.node.id === centerNode.id,
      boundArrowIdsByNodeId.get(placement.node.id) ?? [],
    )
  ));
  const laneLabels: SeedShape[] = [
    {
      type: "text",
      x: 80,
      y: 84,
      width: GRAPH_NODE_WIDTH,
      height: 24,
      text: "Incoming",
      fontSize: 18,
      strokeColor: "#0ea5e9",
    },
    {
      type: "text",
      x: 80 + GRAPH_COLUMN_GAP,
      y: 84,
      width: GRAPH_NODE_WIDTH,
      height: 24,
      text: "Current File",
      fontSize: 18,
      strokeColor: "#22d3ee",
    },
    {
      type: "text",
      x: 80 + GRAPH_COLUMN_GAP * 2,
      y: 84,
      width: GRAPH_NODE_WIDTH,
      height: 24,
      text: "Outgoing",
      fontSize: 18,
      strokeColor: "#14b8a6",
    },
  ];
  return [
    ...laneLabels,
    ...createGraphEdgeShapes(graph, placements),
    ...nodeShapes,
  ];
}

function createElementId(index: number): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `intent-seed-${Date.now().toString(36)}-${index}`;
}

function createSeedElement(shape: SeedShape, index: number): OrderedExcalidrawElement {
  const baseElement = {
    id: shape.id ?? createElementId(index),
    type: shape.type,
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
    angle: 0,
    strokeColor: shape.strokeColor,
    backgroundColor: shape.backgroundColor ?? "transparent",
    fillStyle: "solid",
    strokeWidth: shape.strokeWidth ?? 2,
    strokeStyle: "solid",
    roughness: shape.roughness ?? 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: shape.type === "rectangle" ? { type: 3 } : null,
    seed: index + 1,
    version: 1,
    versionNonce: index + 100,
    isDeleted: false,
    boundElements: shape.boundElementIds?.length
      ? shape.boundElementIds.map((id) => ({
          id,
          type: inferBoundElementType(id),
        }))
      : null,
    updated: Date.now(),
    link: null,
    locked: false,
  };

  if (shape.type === "text") {
    return {
      ...baseElement,
      text: shape.text ?? "",
      originalText: shape.text ?? "",
      fontSize: shape.fontSize ?? 18,
      fontFamily: 5,
      textAlign: "left",
      verticalAlign: "top",
      baseline: shape.fontSize ?? 18,
      containerId: shape.containerId ?? null,
      lineHeight: 1.25,
    } as unknown as OrderedExcalidrawElement;
  }

  if (shape.type === "arrow") {
    return {
      ...baseElement,
      points: [
        [0, 0],
        [shape.width, shape.height],
      ],
      startBinding: shape.startBindingId
        ? {
            elementId: shape.startBindingId,
            focus: 0,
            gap: 6,
          }
        : null,
      endBinding: shape.endBindingId
        ? {
            elementId: shape.endBindingId,
            focus: 0,
            gap: 6,
          }
        : null,
      startArrowhead: null,
      endArrowhead: "arrow",
      lastCommittedPoint: null,
      elbowed: false,
    } as unknown as OrderedExcalidrawElement;
  }

  return baseElement as unknown as OrderedExcalidrawElement;
}

function isIntentCanvasElement(value: unknown): value is OrderedExcalidrawElement {
  return isRecord(value) && typeof value.id === "string" && typeof value.type === "string";
}

function sanitizeIntentCanvasAppState(appState: Partial<AppState> | unknown): Partial<AppState> {
  if (!isRecord(appState)) {
    return {};
  }
  const safeAppState = Object.entries(appState).reduce<Record<string, unknown>>(
    (current, [key, value]) => {
      if (!EXCALIDRAW_RUNTIME_APP_STATE_KEYS.has(key)) {
        current[key] = EXCALIDRAW_OBJECT_MAP_APP_STATE_KEYS.has(key) && !isRecord(value)
          ? {}
          : value === appState
            ? null
            : value;
      }
      return current;
    },
    {},
  );
  return toJsonObject(safeAppState) as Partial<AppState>;
}

export function sanitizeIntentCanvasScene(
  elements: readonly OrderedExcalidrawElement[] | readonly unknown[],
  appState: Partial<AppState> | unknown,
  files: BinaryFiles | unknown,
): IntentCanvasScene {
  const safeElements: OrderedExcalidrawElement[] = [];
  elements.forEach((element) => {
    if (isIntentCanvasElement(element)) {
      safeElements.push(element);
    }
  });
  return {
    elements: safeElements,
    appState: sanitizeIntentCanvasAppState(appState),
    files: toJsonObject(files) as BinaryFiles,
  };
}

export function createInitialIntentCanvasScene(
  source?: IntentCanvasOpenSource | null,
  seedSemanticGraphs?: CanvasSemanticGraph[],
): IntentCanvasScene {
  const graphSeedSkeleton = buildGraphSeedSkeleton(seedSemanticGraphs);
  const elements = (graphSeedSkeleton.length ? graphSeedSkeleton : buildSeedSkeleton(source)).map(createSeedElement);
  return sanitizeIntentCanvasScene(
    elements,
    {
      viewBackgroundColor: "#fbfaf7",
      gridSize: 20,
      zoom: { value: 1 },
      scrollX: 0,
      scrollY: 0,
    },
    {},
  );
}

export function buildIntentCanvasAiContext(
  scene: IntentCanvasScene,
  summary: string,
): IntentCanvasAiContext {
  const elementDigest: IntentCanvasElementDigest[] = [];
  const relationDigest: IntentCanvasRelationDigest[] = [];

  scene.elements.forEach((element) => {
    const rawElement = element as unknown as Record<string, unknown>;
    if (rawElement.isDeleted === true) {
      return;
    }
    const type = typeof rawElement.type === "string" ? rawElement.type : "unknown";
    const id = typeof rawElement.id === "string" ? rawElement.id : `${type}-${elementDigest.length + 1}`;
    const label = readElementLabel(rawElement);
    if (type === "arrow" || type === "line") {
      const startBinding = isRecord(rawElement.startBinding) ? rawElement.startBinding : null;
      const endBinding = isRecord(rawElement.endBinding) ? rawElement.endBinding : null;
      relationDigest.push({
        id,
        type,
        label,
        startBindingId: typeof startBinding?.elementId === "string" ? startBinding.elementId : null,
        endBindingId: typeof endBinding?.elementId === "string" ? endBinding.elementId : null,
      });
    }
    elementDigest.push({
      id,
      type,
      label,
      x: finiteNumber(rawElement.x),
      y: finiteNumber(rawElement.y),
      width: finiteNumber(rawElement.width),
      height: finiteNumber(rawElement.height),
    });
  });

  return {
    elementDigest: elementDigest.slice(0, 80),
    relationDigest: relationDigest.slice(0, 80),
    lastContextSnapshot: JSON.stringify(
      {
        summary: summary.trim(),
        elements: elementDigest.slice(0, 40),
        relations: relationDigest.slice(0, 40),
      },
      null,
      2,
    ),
  };
}

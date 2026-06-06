import type { IntentCanvasDocument } from "../types";

function listOrNone(items: string[]): string[] {
  return items.length > 0 ? items.map((item) => `- ${item}`) : ["- none"];
}

export function formatIntentCanvasThreadContext(
  document: IntentCanvasDocument,
  workspaceName: string | null | undefined,
): string {
  const modeLabel =
    document.mode === "architect"
      ? "架构师白板 Architect Canvas"
      : document.mode === "spotlight"
        ? "代码探照灯 Code Spotlight"
        : "文件意图图 File Intent Canvas";
  const elementLines = document.aiContext.elementDigest.slice(0, 40).map((element, index) => {
    const label = element.label ? ` - ${element.label}` : "";
    const position = element.x !== null && element.y !== null ? ` @(${element.x}, ${element.y})` : "";
    return `${index + 1}. ${element.type}${label}${position}`;
  });
  const relationLines = document.aiContext.relationDigest.slice(0, 40).map((relation, index) => {
    const label = relation.label ? ` - ${relation.label}` : "";
    const binding = relation.startBindingId || relation.endBindingId
      ? ` [${relation.startBindingId ?? "?"} -> ${relation.endBindingId ?? "?"}]`
      : "";
    return `${index + 1}. ${relation.type}${label}${binding}`;
  });
  const payload = {
    type: "intent_canvas_context",
    canvasId: document.id,
    title: document.title,
    mode: document.mode,
    workspaceName: workspaceName ?? document.workspace.name,
    summary: document.summary,
    links: document.links,
    elementDigest: document.aiContext.elementDigest,
    relationDigest: document.aiContext.relationDigest,
    updatedAt: document.updatedAt,
  };

  return [
    "请把下面的 Intent Canvas 当作本轮对话的结构化上下文。",
    "它是用户绘制的意图/逻辑图，不代表代码已经实现，也不要自动写回 Project Map 事实。",
    "",
    `Canvas: ${document.title}`,
    `Mode: ${modeLabel}`,
    `Workspace: ${workspaceName ?? document.workspace.name ?? "unknown"}`,
    `Updated: ${document.updatedAt}`,
    "",
    "Intent Summary:",
    document.summary.trim() || "未填写",
    "",
    "Linked files:",
    ...listOrNone(document.links.filePaths),
    "",
    "Linked Project Map nodes:",
    ...listOrNone(document.links.projectMapNodeIds),
    "",
    "Linked threads:",
    ...listOrNone(document.links.threadIds),
    "",
    "Element digest:",
    ...(elementLines.length > 0 ? elementLines : ["- none"]),
    "",
    "Relation digest:",
    ...(relationLines.length > 0 ? relationLines : ["- none"]),
    "",
    "Structured payload:",
    "```json",
    JSON.stringify(payload, null, 2),
    "```",
  ].join("\n");
}

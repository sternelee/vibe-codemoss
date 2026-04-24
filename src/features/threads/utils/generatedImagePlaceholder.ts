import type { ConversationItem } from "../../../types";

export const OPTIMISTIC_GENERATED_IMAGE_SOURCE_TOOL_NAME =
  "imagegen-intent-placeholder";

const IMAGEGEN_ACTION_PATTERN =
  /(生成|重生|重新生成|绘制|画(?:一张|个)?|插画|肖像|图像|image|illustration|portrait|generate|create|draw|render)/iu;

function normalizeImagegenIntentText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function stripLeadingImagegenSkillPrefix(text: string) {
  return text
    .replace(/^使用\s+`?imagegen`?\s+skill[，,、:：]?\s*/iu, "")
    .replace(/^use\s+`?imagegen`?\s+skill[，,、:：]?\s*/iu, "")
    .trim();
}

export function extractOptimisticGeneratedImagePrompt(text: string) {
  const normalized = normalizeImagegenIntentText(text);
  if (!normalized) {
    return null;
  }
  const lower = normalized.toLowerCase();
  if (!lower.includes("imagegen") || !lower.includes("skill")) {
    return null;
  }
  if (!IMAGEGEN_ACTION_PATTERN.test(normalized)) {
    return null;
  }
  let promptText = stripLeadingImagegenSkillPrefix(normalized);
  const repeatedImagegenIndex = promptText
    .toLowerCase()
    .indexOf("imagegen skill");
  if (repeatedImagegenIndex > 0) {
    promptText = promptText.slice(0, repeatedImagegenIndex).trim();
  }
  return promptText || normalized;
}

export function createOptimisticGeneratedImagePlaceholder({
  threadId,
  itemId,
  promptText,
}: {
  threadId: string;
  itemId: string;
  promptText: string;
}): Extract<ConversationItem, { kind: "generatedImage" }> {
  const normalizedItemId = itemId.trim() || "assistant-imagegen-intent";
  return {
    id: `optimistic-generated-image:${threadId}:${normalizedItemId}`,
    kind: "generatedImage",
    status: "processing",
    sourceToolName: OPTIMISTIC_GENERATED_IMAGE_SOURCE_TOOL_NAME,
    promptText,
    images: [],
  };
}

export function isOptimisticGeneratedImagePlaceholder(
  item: ConversationItem | undefined,
): item is Extract<ConversationItem, { kind: "generatedImage" }> {
  return (
    item?.kind === "generatedImage" &&
    item.status === "processing" &&
    item.sourceToolName === OPTIMISTIC_GENERATED_IMAGE_SOURCE_TOOL_NAME &&
    item.images.length === 0
  );
}

export function normalizeGeneratedImagePrompt(value: string | undefined) {
  return value?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
}

export function scoreGeneratedImagePlaceholderMatch(
  placeholder: Extract<ConversationItem, { kind: "generatedImage" }>,
  incoming: Extract<ConversationItem, { kind: "generatedImage" }>,
) {
  let score = 0;
  const placeholderPrompt = normalizeGeneratedImagePrompt(placeholder.promptText);
  const incomingPrompt = normalizeGeneratedImagePrompt(incoming.promptText);
  if (placeholderPrompt && incomingPrompt) {
    if (
      placeholderPrompt === incomingPrompt ||
      placeholderPrompt.includes(incomingPrompt) ||
      incomingPrompt.includes(placeholderPrompt)
    ) {
      score += 3;
    }
  }
  if (
    placeholder.anchorUserMessageId &&
    incoming.anchorUserMessageId &&
    placeholder.anchorUserMessageId === incoming.anchorUserMessageId
  ) {
    score += 2;
  }
  return score;
}

import type { ConversationItem } from "../../../types";
import {
  isOptimisticGeneratedImagePlaceholder,
  scoreGeneratedImagePlaceholderMatch,
} from "./generatedImagePlaceholder";

export function replaceMatchingOptimisticGeneratedImagePlaceholder(
  list: ConversationItem[],
  incoming: Extract<ConversationItem, { kind: "generatedImage" }>,
) {
  const optimisticPlaceholders = list
    .map((item, index) => ({ item, index }))
    .filter(
      (
        entry,
      ): entry is {
        item: Extract<ConversationItem, { kind: "generatedImage" }>;
        index: number;
      } => isOptimisticGeneratedImagePlaceholder(entry.item),
    );
  if (optimisticPlaceholders.length === 0) {
    return null;
  }
  let matchedIndex = -1;
  let matchedScore = 0;
  optimisticPlaceholders.forEach(({ item, index }) => {
    const score = scoreGeneratedImagePlaceholderMatch(item, incoming);
    if (score >= matchedScore) {
      matchedScore = score;
      matchedIndex = index;
    }
  });
  const targetIndex =
    matchedScore > 0
      ? matchedIndex
      : optimisticPlaceholders.length === 1
        ? optimisticPlaceholders[0]!.index
        : -1;
  if (targetIndex < 0) {
    return null;
  }
  const target = list[targetIndex];
  if (!isOptimisticGeneratedImagePlaceholder(target)) {
    return null;
  }
  const next = [...list];
  next[targetIndex] = {
    ...target,
    ...incoming,
    id: incoming.id,
    promptText: incoming.promptText || target.promptText,
    fallbackText: incoming.fallbackText || target.fallbackText,
    anchorUserMessageId:
      incoming.anchorUserMessageId ?? target.anchorUserMessageId,
    images: incoming.images.length > 0 ? incoming.images : target.images,
  };
  return next;
}

export function shouldPreserveOptimisticGeneratedImagePlaceholder(
  item: ConversationItem,
  incomingItems: ConversationItem[],
  incomingIds: Set<string>,
) {
  if (!isOptimisticGeneratedImagePlaceholder(item)) {
    return false;
  }
  if (incomingIds.has(item.id)) {
    return false;
  }
  const incomingGeneratedImages = incomingItems.filter(
    (
      candidate,
    ): candidate is Extract<ConversationItem, { kind: "generatedImage" }> =>
      candidate.kind === "generatedImage" &&
      !isOptimisticGeneratedImagePlaceholder(candidate),
  );
  if (incomingGeneratedImages.length === 0) {
    return true;
  }
  return !incomingGeneratedImages.some(
    (candidate) => scoreGeneratedImagePlaceholderMatch(item, candidate) > 0,
  );
}

import { describe, expect, it } from "vitest";
import { buildMessageRowPresentation } from "./messageRowPresentation";

describe("buildMessageRowPresentation", () => {
  it("derives assistant presentation from immutable item state", () => {
    const result = buildMessageRowPresentation({
      item: {
        id: "assistant-1",
        kind: "message",
        role: "assistant",
        text: "seed",
      },
      enableCollaborationBadge: false,
      suppressMemorySummaryCard: false,
      suppressNoteCardSummaryCard: false,
    });

    expect(result.displayText).toBe("seed");
    expect(result.messageRowSubtype).toBe("assistant");
  });

  it("derives static image presentation while filtering note-card owned images", () => {
    const result = buildMessageRowPresentation({
      item: {
        id: "assistant-2",
        kind: "message",
        role: "assistant",
        text: "response",
        images: ["/workspace/visible.png"],
      },
      enableCollaborationBadge: false,
      suppressMemorySummaryCard: false,
      suppressNoteCardSummaryCard: false,
    });

    expect(result.imageItems).toHaveLength(1);
    expect(result.imageItems[0]?.label).toBe("Image 1");
  });
});

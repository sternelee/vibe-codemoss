// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MutableRefObject } from "react";
import type { ConversationItem } from "../../../types";
import { sendConversationCompletionEmail } from "../../../services/tauri";
import { useThreadCompletionEmail } from "./useThreadCompletionEmail";

vi.mock("../../../services/tauri", () => ({
  sendConversationCompletionEmail: vi.fn(),
}));

vi.mock("../../../services/toasts", () => ({
  pushErrorToast: vi.fn(),
}));

function mutableRef<T>(current: T): MutableRefObject<T> {
  return { current };
}

const baseMetadata = {
  workspaceId: "ws-1",
  workspaceName: "ccgui",
  workspacePath: "/tmp/project",
  threadId: "codex:first",
  threadName: "Codex first",
  turnId: "turn-1",
  engine: "codex" as const,
};

describe("useThreadCompletionEmail", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.mocked(sendConversationCompletionEmail).mockResolvedValue({
      provider: "custom",
      acceptedRecipients: ["dev@example.com"],
      durationMs: 12,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries when Codex completion settles before the final assistant message is visible", async () => {
    const activeTurnIdByThreadRef = mutableRef<Record<string, string | null>>({
      "codex:first": "turn-1",
    });
    const userItem: ConversationItem = {
      id: "user-1",
      kind: "message",
      role: "user",
      text: "完成后发邮件",
    };
    const itemsByThreadRef = mutableRef<Record<string, ConversationItem[]>>({
      "codex:first": [userItem],
    });
    const setActiveTurnId = vi.fn();
    const onDebug = vi.fn();
    const { result } = renderHook(() =>
      useThreadCompletionEmail({
        activeThreadId: "codex:first",
        activeTurnIdByThreadRef,
        itemsByThreadRef,
        resolveCanonicalThreadId: (threadId) => threadId,
        setActiveTurnId,
        getCompletionEmailMetadata: () => baseMetadata,
        onDebug,
      }),
    );

    act(() => {
      result.current.toggleCompletionEmailIntent("codex:first");
    });

    expect(result.current.completionEmailIntentByThread["codex:first"]).toBeDefined();

    act(() => {
      result.current.settleCompletionEmailIntent("ws-1", "codex:first", "turn-1", "completed");
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(sendConversationCompletionEmail).not.toHaveBeenCalled();
    expect(onDebug).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "completion-email/build-retry",
        payload: expect.objectContaining({
          reason: "missing_assistant_message",
          attempt: 1,
        }),
      }),
    );

    itemsByThreadRef.current = {
      "codex:first": [
        userItem,
        {
          id: "assistant-1",
          kind: "message",
          role: "assistant",
          text: "Codex 已完成。",
          isFinal: true,
        },
      ],
    };

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });

    expect(sendConversationCompletionEmail).toHaveBeenCalledTimes(1);
    expect(sendConversationCompletionEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws-1",
        threadId: "codex:first",
        turnId: "turn-1",
        textBody: expect.stringContaining("Codex 已完成。"),
      }),
    );
  });
});

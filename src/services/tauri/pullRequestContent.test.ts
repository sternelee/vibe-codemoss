import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { generatePullRequestContent } from "./pullRequestContent";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("pullRequestContent", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.mocked(invoke).mockReset();
  });

  describe("generatePullRequestContent", () => {
    it("invokes the backend command and returns structured content", async () => {
      vi.mocked(invoke).mockResolvedValue({
        title: "feat(pr): 自动生成 PR 内容",
        body: "## 背景\n- ...",
        engine: "codex",
        language: "zh",
      });

      const result = await generatePullRequestContent(
        "workspace-1",
        "zh",
        "codex",
        "upstream/main",
        "feature/v0.7.4",
      );

      expect(invoke).toHaveBeenCalledWith("generate_pull_request_content", {
        workspaceId: "workspace-1",
        language: "zh",
        engine: "codex",
        baseBranch: "upstream/main",
        headBranch: "feature/v0.7.4",
      });
      expect(result).toEqual({
        title: "feat(pr): 自动生成 PR 内容",
        body: "## 背景\n- ...",
        engine: "codex",
        language: "zh",
      });
    });

    it("passes english language and base/head branches through to backend", async () => {
      vi.mocked(invoke).mockResolvedValue({
        title: "feat(pr): generate PR content",
        body: "## Background\n- ...",
        engine: "claude",
        language: "en",
      });

      await generatePullRequestContent(
        "workspace-2",
        "en",
        "claude",
        "upstream/main",
        "feature/x",
      );

      expect(invoke).toHaveBeenCalledWith("generate_pull_request_content", {
        workspaceId: "workspace-2",
        language: "en",
        engine: "claude",
        baseBranch: "upstream/main",
        headBranch: "feature/x",
      });
    });

    it("rejects unsupported engines with unsupported_engine", async () => {
      // ponytail: future engines (e.g. bogus) must be rejected client-side
      // so the UI never spins on a non-existent backend path.
      await expect(
        generatePullRequestContent(
          "workspace-3",
          "zh",
          "bogus" as never,
          "main",
          "feature/v0.7.4",
        ),
      ).rejects.toThrow("unsupported_engine");
      expect(invoke).not.toHaveBeenCalled();
    });

    it("propagates backend errors", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("codex missing"));

      await expect(
        generatePullRequestContent(
          "workspace-4",
          "zh",
          "codex",
          "main",
          "feature/v0.7.4",
        ),
      ).rejects.toThrow("codex missing");
    });

    it("reports a soft warning after 60 seconds without rejecting", async () => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
      vi.mocked(invoke).mockReturnValue(new Promise(() => {}));
      const onProgress = vi.fn();

      void generatePullRequestContent(
        "workspace-5",
        "zh",
        "codex",
        "main",
        "feature/x",
        onProgress,
      );
      await vi.advanceTimersByTimeAsync(60_000);

      expect(onProgress).toHaveBeenCalledWith({
        kind: "soft-warn",
        elapsedMs: 60_000,
      });
      vi.useRealTimers();
    });

    it("rejects after five minutes and reports the hard timeout", async () => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
      vi.mocked(invoke).mockReturnValue(new Promise(() => {}));
      const onProgress = vi.fn();
      const pending = generatePullRequestContent(
        "workspace-6",
        "zh",
        "claude",
        "main",
        "feature/x",
        onProgress,
      );
      const expectation = expect(pending).rejects.toThrow(
        "timed out after 300s",
      );

      await vi.advanceTimersByTimeAsync(300_000);
      await expectation;
      expect(onProgress).toHaveBeenCalledWith({
        kind: "hard-timeout",
        elapsedMs: 300_000,
      });
      vi.useRealTimers();
    });
  });

});

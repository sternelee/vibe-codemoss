import { invoke } from "@tauri-apps/api/core";
import type {
  CommitMessageEngine,
  CommitMessageLanguage,
} from "./commitMessage";
import { isEngineExecutionEnabled } from "../../utils/engineExecutionPolicy";

export type PullRequestGeneratedContent = {
  title: string;
  body: string;
  engine: string;
  language: string;
};

// ponytail: PR diff 通常 20-60K chars,喂给 LLM + 推理 + JSON 解析,
// 在大 diff 上 60s 完全不够;给到 5 分钟,中间 60s 时打个警告让 UI 能感知。
const GENERATE_TIMEOUT_MS = 5 * 60 * 1000;
const SOFT_WARN_AFTER_MS = 60 * 1000;

export type PullRequestProgressEvent =
  | { kind: "soft-warn"; elapsedMs: number }
  | { kind: "hard-timeout"; elapsedMs: number };

export async function generatePullRequestContent(
  workspaceId: string,
  language: CommitMessageLanguage = "zh",
  engine: CommitMessageEngine = "codex",
  baseBranch: string,
  headBranch: string,
  onProgress?: (event: PullRequestProgressEvent) => void,
): Promise<PullRequestGeneratedContent> {
  if (!isEngineExecutionEnabled(engine)) {
    throw new Error("unsupported_engine");
  }

  const startedAt = Date.now();

  // ponytail: 60s 后若还没回,通知 UI 进入「长时间运行」视觉状态(避免用户以为卡住)。
  // 这个 timer 在 promise resolve / reject / unmount 时都清掉。
  const softWarnTimer = globalThis.setTimeout(() => {
    try {
      onProgress?.({ kind: "soft-warn", elapsedMs: Date.now() - startedAt });
    } catch {
      // 用户回调不能影响主流程
    }
  }, SOFT_WARN_AFTER_MS);

  // ponytail: 用 Promise.race 包一层,超时由外部 timer 直接 reject,
  // 避免 finally 里 throw(ESLint no-unsafe-finally 也会拒绝)。
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<PullRequestGeneratedContent>(
    (_, reject) => {
      timeoutHandle = globalThis.setTimeout(() => {
        const elapsed = Date.now() - startedAt;
        try {
          onProgress?.({ kind: "hard-timeout", elapsedMs: elapsed });
        } catch {
          // ignore
        }
        reject(
          new Error(
            `generate_pull_request_content timed out after ${Math.round(
              GENERATE_TIMEOUT_MS / 1000,
            )}s`,
          ),
        );
      }, GENERATE_TIMEOUT_MS);
    },
  );

  try {
    const result = await Promise.race([
      invoke<PullRequestGeneratedContent>("generate_pull_request_content", {
        workspaceId,
        language,
        engine,
        baseBranch,
        headBranch,
      }),
      timeoutPromise,
    ]);
    return result;
  } catch (error) {
    // ponytail: Tauri 拒绝时往往把后端错误包成 plain object,这里统一抽出 message
    if (error && typeof error === "object" && "message" in error) {
      throw new Error(String((error as { message: unknown }).message));
    }
    throw error instanceof Error ? error : new Error(String(error));
  } finally {
    globalThis.clearTimeout(softWarnTimer);
    if (timeoutHandle !== undefined) {
      globalThis.clearTimeout(timeoutHandle);
    }
  }
}

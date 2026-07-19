import type { HistoryLoader } from "../contracts/conversationCurtainContracts";
import { normalizeHistorySnapshot } from "../contracts/conversationCurtainContracts";
import { parseKimiHistoryMessages } from "./kimiHistoryParser";

type KimiHistoryLoaderOptions = {
  workspaceId: string;
  workspacePath: string | null;
  loadKimiSession: (
    workspacePath: string,
    sessionId: string,
  ) => Promise<unknown>;
};

export function createKimiHistoryLoader({
  workspaceId,
  workspacePath,
  loadKimiSession,
}: KimiHistoryLoaderOptions): HistoryLoader {
  return {
    engine: "kimi",
    async load(threadId: string) {
      const sessionId = threadId.startsWith("kimi:")
        ? threadId.slice("kimi:".length)
        : threadId;
      if (!workspacePath) {
        return normalizeHistorySnapshot({
          engine: "kimi",
          workspaceId,
          threadId,
          meta: {
            workspaceId,
            threadId,
            engine: "kimi",
            activeTurnId: null,
            isThinking: false,
            heartbeatPulse: null,
            historyRestoredAtMs: Date.now(),
          },
        });
      }

      const result = await loadKimiSession(workspacePath, sessionId);
      const record = result as { messages?: unknown };
      const messagesData = record.messages ?? result;
      const items = parseKimiHistoryMessages(messagesData);

      return normalizeHistorySnapshot({
        engine: "kimi",
        workspaceId,
        threadId,
        items,
        plan: null,
        userInputQueue: [],
        meta: {
          workspaceId,
          threadId,
          engine: "kimi",
          activeTurnId: null,
          isThinking: false,
          heartbeatPulse: null,
          historyRestoredAtMs: Date.now(),
        },
      });
    },
  };
}

import type { ThreadSummary, WorkspaceInfo } from "../types";

export type LatestAgentRun = {
  threadId: string;
  message: string;
  timestamp: number;
  projectName: string;
  groupName?: string | null;
  workspaceId: string;
  isProcessing: boolean;
};

type ThreadProcessingStatus = {
  isProcessing?: boolean;
};

export type BuildLatestAgentRunsInput = {
  workspaces: Pick<WorkspaceInfo, "id" | "name">[];
  threadsByWorkspace: Record<
    string,
    Pick<ThreadSummary, "id" | "name" | "updatedAt">[]
  >;
  lastAgentMessageByThread: Record<string, { text: string; timestamp: number }>;
  threadStatusById: Record<string, ThreadProcessingStatus | undefined>;
  getWorkspaceGroupName: (workspaceId: string) => string | null | undefined;
};

export type ResolveLatestAgentFeedLoadingInput = {
  hasLoaded: boolean;
  workspaces: Pick<WorkspaceInfo, "id">[];
  threadListLoadingByWorkspace: Record<string, boolean | undefined>;
};

export function buildLatestAgentRuns({
  workspaces,
  threadsByWorkspace,
  lastAgentMessageByThread,
  threadStatusById,
  getWorkspaceGroupName,
}: BuildLatestAgentRunsInput): LatestAgentRun[] {
  // 只取 top-3：单趟遍历维护有序小数组，避免全量收集 + O(N log N) 排序。
  const LIMIT = 3;
  const top: LatestAgentRun[] = [];
  const insert = (candidate: LatestAgentRun) => {
    if (top.length === LIMIT && candidate.timestamp <= (top[LIMIT - 1]?.timestamp ?? 0)) {
      return;
    }
    let insertAt = top.length;
    while (insertAt > 0 && (top[insertAt - 1]?.timestamp ?? 0) < candidate.timestamp) {
      insertAt -= 1;
    }
    top.splice(insertAt, 0, candidate);
    if (top.length > LIMIT) {
      top.pop();
    }
  };
  workspaces.forEach((workspace) => {
    const threads = threadsByWorkspace[workspace.id] ?? [];
    threads.forEach((thread) => {
      const entry = lastAgentMessageByThread[thread.id];
      if (entry) {
        insert({
          threadId: thread.id,
          message: entry.text,
          timestamp: entry.timestamp,
          projectName: workspace.name,
          groupName: getWorkspaceGroupName(workspace.id),
          workspaceId: workspace.id,
          isProcessing: threadStatusById[thread.id]?.isProcessing ?? false,
        });
      } else if (thread.id.startsWith("claude:")) {
        insert({
          threadId: thread.id,
          message: thread.name,
          timestamp: thread.updatedAt,
          projectName: workspace.name,
          groupName: getWorkspaceGroupName(workspace.id),
          workspaceId: workspace.id,
          isProcessing: false,
        });
      }
    });
  });
  return top;
}

export function resolveLatestAgentFeedLoading({
  hasLoaded,
  workspaces,
  threadListLoadingByWorkspace,
}: ResolveLatestAgentFeedLoadingInput): boolean {
  return (
    !hasLoaded ||
    workspaces.some(
      (workspace) => threadListLoadingByWorkspace[workspace.id] ?? false,
    )
  );
}

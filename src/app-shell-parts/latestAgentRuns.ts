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
  const entries: LatestAgentRun[] = [];
  workspaces.forEach((workspace) => {
    const threads = threadsByWorkspace[workspace.id] ?? [];
    threads.forEach((thread) => {
      const entry = lastAgentMessageByThread[thread.id];
      if (entry) {
        entries.push({
          threadId: thread.id,
          message: entry.text,
          timestamp: entry.timestamp,
          projectName: workspace.name,
          groupName: getWorkspaceGroupName(workspace.id),
          workspaceId: workspace.id,
          isProcessing: threadStatusById[thread.id]?.isProcessing ?? false,
        });
      } else if (thread.id.startsWith("claude:")) {
        entries.push({
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
  return entries.sort((a, b) => b.timestamp - a.timestamp).slice(0, 3);
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

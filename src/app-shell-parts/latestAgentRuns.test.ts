import { describe, expect, it } from "vitest";
import {
  buildLatestAgentRuns,
  resolveLatestAgentFeedLoading,
} from "./latestAgentRuns";

describe("buildLatestAgentRuns", () => {
  it("uses last agent messages before Claude thread fallback rows", () => {
    const runs = buildLatestAgentRuns({
      workspaces: [
        { id: "workspace-a", name: "Workspace A" },
        { id: "workspace-b", name: "Workspace B" },
      ],
      threadsByWorkspace: {
        "workspace-a": [
          { id: "thread-a", name: "Thread A", updatedAt: 100 },
          { id: "claude:thread-b", name: "Claude B", updatedAt: 200 },
        ],
        "workspace-b": [{ id: "thread-c", name: "Thread C", updatedAt: 300 }],
      },
      lastAgentMessageByThread: {
        "thread-a": { text: "agent reply", timestamp: 400 },
      },
      threadStatusById: {
        "thread-a": { isProcessing: true },
        "thread-c": { isProcessing: true },
      },
      getWorkspaceGroupName: (workspaceId) =>
        workspaceId === "workspace-a" ? "Group A" : null,
    });

    expect(runs).toEqual([
      {
        threadId: "thread-a",
        message: "agent reply",
        timestamp: 400,
        projectName: "Workspace A",
        groupName: "Group A",
        workspaceId: "workspace-a",
        isProcessing: true,
      },
      {
        threadId: "claude:thread-b",
        message: "Claude B",
        timestamp: 200,
        projectName: "Workspace A",
        groupName: "Group A",
        workspaceId: "workspace-a",
        isProcessing: false,
      },
    ]);
  });

  it("sorts by timestamp and limits the radar feed to three runs", () => {
    const runs = buildLatestAgentRuns({
      workspaces: [{ id: "workspace", name: "Workspace" }],
      threadsByWorkspace: {
        workspace: [
          { id: "claude:old", name: "Old", updatedAt: 100 },
          { id: "claude:new", name: "New", updatedAt: 500 },
          { id: "thread-agent", name: "Agent", updatedAt: 200 },
          { id: "claude:middle", name: "Middle", updatedAt: 300 },
        ],
      },
      lastAgentMessageByThread: {
        "thread-agent": { text: "Agent latest", timestamp: 400 },
      },
      threadStatusById: {},
      getWorkspaceGroupName: () => undefined,
    });

    expect(runs.map((run) => run.threadId)).toEqual([
      "claude:new",
      "thread-agent",
      "claude:middle",
    ]);
  });

  it("reports feed loading before workspace hydration or while any workspace list is loading", () => {
    expect(
      resolveLatestAgentFeedLoading({
        hasLoaded: false,
        workspaces: [],
        threadListLoadingByWorkspace: {},
      }),
    ).toBe(true);

    expect(
      resolveLatestAgentFeedLoading({
        hasLoaded: true,
        workspaces: [{ id: "workspace" }],
        threadListLoadingByWorkspace: { workspace: true },
      }),
    ).toBe(true);

    expect(
      resolveLatestAgentFeedLoading({
        hasLoaded: true,
        workspaces: [{ id: "workspace" }],
        threadListLoadingByWorkspace: { workspace: false },
      }),
    ).toBe(false);
  });
});

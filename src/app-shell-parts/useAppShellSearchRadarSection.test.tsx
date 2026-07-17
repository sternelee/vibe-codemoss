// @vitest-environment jsdom
import { useState } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceSearchFileSnapshot } from "../features/search/types";
import type { AppSettings, WorkspaceInfo } from "../types";
import { useAppShellSearchRadarSection } from "./useAppShellSearchRadarSection";

const prewarmSessionRadarForWorkspaceMock = vi.hoisted(() => vi.fn());
const useUnifiedSearchMock = vi.hoisted(() => vi.fn(() => []));
const isBackgroundRenderGatingEnabledMock = vi.hoisted(() => vi.fn(() => true));
const getWorkspaceFilesMock = vi.hoisted(() => vi.fn());

vi.mock("../features/app/hooks/useComposerInsert", () => ({
  useComposerInsert: vi.fn(() => vi.fn()),
}));

vi.mock("../features/composer/hooks/useInputHistoryStore", () => ({
  loadHistoryWithImportance: vi.fn(() => []),
}));

vi.mock("../features/search/hooks/useUnifiedSearch", () => ({
  useUnifiedSearch: useUnifiedSearchMock,
}));



vi.mock("../features/threads/utils/realtimePerfFlags", () => ({
  isBackgroundRenderGatingEnabled: isBackgroundRenderGatingEnabledMock,
}));

vi.mock("../features/session-activity/hooks/useWorkspaceSessionActivity", () => ({
  useWorkspaceSessionActivity: vi.fn(() => ({ sections: [] })),
}));

vi.mock("../features/session-activity/hooks/useSessionRadarFeed", () => ({
  useSessionRadarFeed: vi.fn(() => ({
    runningSessions: [],
    recentCompletedSessions: [],
    runningCountByWorkspaceId: {},
    recentCountByWorkspaceId: {},
  })),
}));

vi.mock("../features/workspaces/hooks/useWorkspaceSessionProjectionSummary", () => ({
  useWorkspaceSessionProjectionSummary: vi.fn(() => ({
    summary: { ownerWorkspaceIds: ["ws-1"] },
  })),
}));

vi.mock("./useWorkspaceThreadListHydration", () => ({
  useWorkspaceThreadListHydration: vi.fn(() => ({
    ensureWorkspaceThreadListLoaded: vi.fn(),
    hydratedThreadListWorkspaceIdsRef: { current: {} },
    listThreadsForWorkspaceTracked: vi.fn(),
    prewarmSessionRadarForWorkspace: prewarmSessionRadarForWorkspaceMock,
  })),
}));

vi.mock("../services/clientStorage", () => ({
  getClientStoreSync: vi.fn(() => null),
  writeClientStoreValue: vi.fn(),
}));

vi.mock("../services/systemNotification", () => ({
  sendSystemNotification: vi.fn(),
}));

vi.mock("../services/tauri", () => ({
  getWorkspaceFiles: getWorkspaceFilesMock,
}));

function createWorkspace(id: string, name: string): WorkspaceInfo {
  return {
    id,
    name,
    path: `/tmp/${id}`,
    settings: { sidebarCollapsed: false },
    connected: true,
    kind: "main",
  } as unknown as WorkspaceInfo;
}

type SearchRadarOptions = Parameters<typeof useAppShellSearchRadarSection>[0];

function createSearchRadarOptions(
  overrides: Partial<SearchRadarOptions> = {},
): SearchRadarOptions {
  const workspace = createWorkspace("ws-1", "Workspace 1");
  return {
    activeItems: [],
    activeThreadId: null,
    activeWorkspace: workspace,
    activeWorkspaceId: workspace.id,
    appSettings: { systemNotificationEnabled: false } as AppSettings,
    commands: [],
    composerInputRef: { current: null },
    completionTrackerBySessionRef: { current: {} },
    completionTrackerReadyRef: { current: false },
    directories: [],
    filePanelMode: "git",
    fileTreeSourceVersion: "shallow-v1",
    files: ["README.md"],
    getActiveDraft: () => "",
    globalSearchFilesByWorkspace: {},
    handleDraftChange: vi.fn(),
    isCompact: false,
    isFilesLoading: false,
    isProcessing: false,
    isSearchPaletteOpen: true,
    kanbanTasks: [],
    lastAgentMessageByThread: {},
    listThreadsForWorkspace: vi.fn(async () => {}),
    rightPanelCollapsed: false,
    searchContentFilters: ["files"],
    searchPaletteQuery: "nested",
    searchScope: "active-workspace",
    setGlobalSearchFilesByWorkspace: vi.fn(),
    skills: [],
    t: (key: string) => key,
    threadItemsByThread: {},
    threadListLoadingByWorkspace: {},
    threadParentById: {},
    threadStatusById: {},
    threadsByWorkspace: {},
    workspaces: [workspace],
    workspacesById: new Map([[workspace.id, workspace]]),
    ...overrides,
  };
}

describe("useAppShellSearchRadarSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prewarmSessionRadarForWorkspaceMock.mockReset();
    useUnifiedSearchMock.mockClear();
    isBackgroundRenderGatingEnabledMock.mockReset();
    isBackgroundRenderGatingEnabledMock.mockReturnValue(true);
    getWorkspaceFilesMock.mockReset();
    getWorkspaceFilesMock.mockResolvedValue({
      files: [],
      directories: [],
      gitignored_files: [],
      gitignored_directories: [],
      scan_state: "complete",
    });
  });

  it("keeps recent thread titles aligned with sidebar thread summaries", () => {
    const workspace = createWorkspace("ws-1", "Workspace 1");
    const appSettings = {
      systemNotificationEnabled: false,
    } as AppSettings;

    const { result } = renderHook(() =>
      useAppShellSearchRadarSection({
        activeItems: [],
        activeThreadId: null,
        activeWorkspace: workspace,
        activeWorkspaceId: "ws-1",
        appSettings,
        commands: [],
        composerInputRef: { current: null },
        completionTrackerBySessionRef: { current: {} },
        completionTrackerReadyRef: { current: false },
        directories: [],
        filePanelMode: "radar",
        files: [],
        getActiveDraft: () => "",
        globalSearchFilesByWorkspace: {},
        handleDraftChange: vi.fn(),
        isCompact: false,
        isFilesLoading: false,
        isProcessing: false,
        isSearchPaletteOpen: false,
        kanbanTasks: [],
        lastAgentMessageByThread: {},
        listThreadsForWorkspace: vi.fn(async () => {}),
        rightPanelCollapsed: false,
        searchContentFilters: [],
        searchPaletteQuery: "",
        searchScope: "active-workspace",
        setGlobalSearchFilesByWorkspace: vi.fn(),
        skills: [],
        t: (key: string) => key,
        threadItemsByThread: {},
        threadListLoadingByWorkspace: {},
        threadParentById: {},
        threadStatusById: {},
        threadsByWorkspace: {
          "ws-1": [
            {
              id: "codex-agent-1",
              name: "项目分析",
              updatedAt: 2_000,
              engineSource: "codex",
              isDegraded: true,
              partialSource: "local-session-scan-unavailable",
              degradedReason: "partial-thread-list",
            },
            {
              id: "codex-agent-2",
              name: "Agent 20",
              updatedAt: 1_000,
              engineSource: "codex",
            },
          ],
        },
        workspaces: [workspace],
        workspacesById: new Map([[workspace.id, workspace]]),
      }),
    );

    expect(result.current.recentThreads).toEqual([
      expect.objectContaining({
        id: "codex-agent-1",
        threadId: "codex-agent-1",
        title: "项目分析",
        updatedAt: 2_000,
      }),
      expect.objectContaining({
        id: "codex-agent-2",
        threadId: "codex-agent-2",
        title: "Agent 20",
        updatedAt: 1_000,
      }),
    ]);
  });

  it("prewarms session radar through the orchestrated hydration path when radar is visible", () => {
    const workspace = createWorkspace("ws-1", "Workspace 1");
    const appSettings = {
      systemNotificationEnabled: false,
    } as AppSettings;

    renderHook(() =>
      useAppShellSearchRadarSection({
        activeItems: [],
        activeThreadId: null,
        activeWorkspace: workspace,
        activeWorkspaceId: "ws-1",
        appSettings,
        commands: [],
        composerInputRef: { current: null },
        completionTrackerBySessionRef: { current: {} },
        completionTrackerReadyRef: { current: false },
        directories: [],
        filePanelMode: "radar",
        files: [],
        getActiveDraft: () => "",
        globalSearchFilesByWorkspace: {},
        handleDraftChange: vi.fn(),
        isCompact: false,
        isFilesLoading: false,
        isProcessing: false,
        isSearchPaletteOpen: false,
        kanbanTasks: [],
        lastAgentMessageByThread: {},
        listThreadsForWorkspace: vi.fn(async () => {}),
        rightPanelCollapsed: false,
        searchContentFilters: [],
        searchPaletteQuery: "",
        searchScope: "active-workspace",
        setGlobalSearchFilesByWorkspace: vi.fn(),
        skills: [],
        t: (key: string) => key,
        threadItemsByThread: {},
        threadListLoadingByWorkspace: {},
        threadParentById: {},
        threadStatusById: {},
        threadsByWorkspace: {},
        workspaces: [workspace],
        workspacesById: new Map([[workspace.id, workspace]]),
      }),
    );

    expect(prewarmSessionRadarForWorkspaceMock).toHaveBeenCalledWith("ws-1");
  });

  it("does not feed hot thread items into search while the palette is closed", () => {
    const workspace = createWorkspace("ws-1", "Workspace 1");
    const appSettings = {
      systemNotificationEnabled: false,
    } as AppSettings;

    renderHook(() =>
      useAppShellSearchRadarSection({
        activeItems: [],
        activeThreadId: "thread-1",
        activeWorkspace: workspace,
        activeWorkspaceId: "ws-1",
        appSettings,
        commands: [],
        composerInputRef: { current: null },
        completionTrackerBySessionRef: { current: {} },
        completionTrackerReadyRef: { current: false },
        directories: [],
        filePanelMode: "git",
        files: [],
        getActiveDraft: () => "",
        globalSearchFilesByWorkspace: {},
        handleDraftChange: vi.fn(),
        isCompact: false,
        isFilesLoading: false,
        isProcessing: true,
        isSearchPaletteOpen: false,
        kanbanTasks: [],
        lastAgentMessageByThread: {},
        listThreadsForWorkspace: vi.fn(async () => {}),
        rightPanelCollapsed: false,
        searchContentFilters: [],
        searchPaletteQuery: "",
        searchScope: "active-workspace",
        setGlobalSearchFilesByWorkspace: vi.fn(),
        skills: [],
        t: (key: string) => key,
        threadItemsByThread: {
          "thread-1": [
            {
              id: "item-1",
              kind: "message",
              role: "assistant",
              text: "streaming output",
            },
          ],
        },
        threadListLoadingByWorkspace: {},
        threadParentById: {},
        threadStatusById: {
          "thread-1": {
            isProcessing: true,
          },
        },
        threadsByWorkspace: {
          "ws-1": [{ id: "thread-1", name: "Thread", updatedAt: 1 }],
        },
        workspaces: [workspace],
        workspacesById: new Map([[workspace.id, workspace]]),
      }),
    );

    expect(useUnifiedSearchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        threadItemsByThread: {},
      }),
    );
  });

  it("hydrates nested files for active-workspace search despite a shallow cache", async () => {
    getWorkspaceFilesMock.mockResolvedValue({
      files: ["README.md", "src/deep/NestedTarget.ts"],
      directories: ["src", "src/deep"],
      gitignored_files: [],
      gitignored_directories: [],
      scan_state: "complete",
      sourceVersion: "full-v2",
    });
    const baseOptions = createSearchRadarOptions();

    const { result } = renderHook(() => {
      const [cache, setCache] = useState<
        Record<string, WorkspaceSearchFileSnapshot>
      >({
        "ws-1": {
          files: ["README.md"],
          status: "shallow",
          sourceVersion: "shallow-v1",
          error: null,
        },
      });
      const search = useAppShellSearchRadarSection(
        {
          ...baseOptions,
          globalSearchFilesByWorkspace: cache,
          setGlobalSearchFilesByWorkspace: setCache,
        },
      );
      return { cache, search };
    });

    await waitFor(() => {
      expect(result.current.cache["ws-1"]).toMatchObject({
        status: "complete",
        sourceVersion: "full-v2",
        files: ["README.md", "src/deep/NestedTarget.ts"],
      });
    });
    expect(getWorkspaceFilesMock).toHaveBeenCalledTimes(1);
    expect(useUnifiedSearchMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        workspaceSources: [
          expect.objectContaining({
            workspaceId: "ws-1",
            files: ["README.md", "src/deep/NestedTarget.ts"],
          }),
        ],
      }),
    );
    expect(result.current.search.searchFileHydrationStatus).toBe("complete");
  });

  it("does not treat a shallow global cache key as fully hydrated", async () => {
    const workspace2 = createWorkspace("ws-2", "Workspace 2");
    getWorkspaceFilesMock.mockImplementation(async (workspaceId: string) => ({
      files: [`src/${workspaceId}-target.ts`],
      directories: ["src"],
      gitignored_files: [],
      gitignored_directories: [],
      scan_state: workspaceId === "ws-2" ? "partial" : "complete",
      limit_hit: workspaceId === "ws-2",
    }));
    const workspace1 = createWorkspace("ws-1", "Workspace 1");
    const baseOptions = createSearchRadarOptions({
      activeWorkspace: workspace1,
      searchScope: "global",
      workspaces: [workspace1, workspace2],
      workspacesById: new Map([
        ["ws-1", workspace1],
        ["ws-2", workspace2],
      ]),
    });

    const { result } = renderHook(() => {
      const [cache, setCache] = useState<
        Record<string, WorkspaceSearchFileSnapshot>
      >({
        "ws-1": {
          files: [],
          status: "shallow",
          sourceVersion: null,
          error: null,
        },
      });
      const search = useAppShellSearchRadarSection(
        {
          ...baseOptions,
          globalSearchFilesByWorkspace: cache,
          setGlobalSearchFilesByWorkspace: setCache,
        },
      );
      return { cache, search };
    });

    await waitFor(() => {
      expect(result.current.cache["ws-1"]?.status).toBe("complete");
      expect(result.current.cache["ws-2"]?.status).toBe("partial");
    });
    expect(getWorkspaceFilesMock.mock.calls.map(([workspaceId]) => workspaceId)).toEqual([
      "ws-1",
      "ws-2",
    ]);
    expect(result.current.search.searchFileHydrationStatus).toBe("partial");
  });

  it("keeps failed hydration retryable on the next palette lifecycle", async () => {
    getWorkspaceFilesMock
      .mockRejectedValueOnce(new Error("scan failed"))
      .mockResolvedValueOnce({
        files: ["src/recovered.ts"],
        directories: ["src"],
        gitignored_files: [],
        gitignored_directories: [],
        scan_state: "complete",
      });
    const baseOptions = createSearchRadarOptions();

    const { result, rerender } = renderHook(
      ({ isOpen }) => {
        const [cache, setCache] = useState<
          Record<string, WorkspaceSearchFileSnapshot>
        >({});
        const search = useAppShellSearchRadarSection(
          {
            ...baseOptions,
            globalSearchFilesByWorkspace: cache,
            isSearchPaletteOpen: isOpen,
            setGlobalSearchFilesByWorkspace: setCache,
          },
        );
        return { cache, search };
      },
      { initialProps: { isOpen: true } },
    );

    await waitFor(() => {
      expect(result.current.cache["ws-1"]?.status).toBe("error");
    });
    rerender({ isOpen: false });
    rerender({ isOpen: true });
    await waitFor(() => {
      expect(result.current.cache["ws-1"]?.status).toBe("complete");
    });
    expect(getWorkspaceFilesMock).toHaveBeenCalledTimes(2);
  });


});

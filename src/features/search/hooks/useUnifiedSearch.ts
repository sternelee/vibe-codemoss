import { useEffect, useMemo, useState } from "react";
import type {
  ConversationItem,
  CustomCommandOption,
  SkillOption,
  ThreadSummary,
} from "../../../types";
import type { KanbanTask } from "../../kanban/types";
import type { HistoryItem } from "../../composer/hooks/useInputHistoryStore";
import { takeLimited } from "../perf/chunker";
import {
  SEARCH_DEBOUNCE_MS,
  SEARCH_PROVIDER_LIMITS,
  SEARCH_TOTAL_LIMIT,
} from "../perf/limits";
import { reportSearchMetrics } from "../perf/searchMetrics";
import { searchCommands } from "../providers/commandsProvider";
import { searchFiles } from "../providers/filesProvider";
import { searchHistory } from "../providers/historyProvider";
import { searchKanbanTasks } from "../providers/kanbanProvider";
import { searchMessages } from "../providers/messageProvider";
import { searchSkills } from "../providers/skillsProvider";
import { searchThreads } from "../providers/threadProvider";
import { loadSearchRecencyMap } from "../ranking/recencyStore";
import { compareSearchResults } from "../ranking/score";
import type { SearchContentFilter, SearchResult } from "../types";

type WorkspaceSearchSource = {
  workspaceId: string;
  workspaceName: string;
  files: string[];
  threads: ThreadSummary[];
};

type UseUnifiedSearchOptions = {
  query: string;
  contentFilters: SearchContentFilter[];
  workspaceSources: WorkspaceSearchSource[];
  kanbanTasks: KanbanTask[];
  threadItemsByThread: Record<string, ConversationItem[]>;
  historyItems: HistoryItem[];
  skills: SkillOption[];
  commands: CustomCommandOption[];
  activeWorkspaceId?: string | null;
  maxResults?: number;
  workspaceNameByPath?: Map<string, string>;
};

export type ComputeUnifiedSearchOptions = Omit<UseUnifiedSearchOptions, "query" | "scope"> & {
  query: string;
  recencyMap?: Record<string, number>;
  reportMetrics?: boolean;
};

function shouldIncludeSection(
  filters: SearchContentFilter[],
  section: Exclude<SearchContentFilter, "all">,
): boolean {
  return filters.includes("all") || filters.includes(section);
}

function attachWorkspaceLabel(
  result: SearchResult,
  workspaceNameById: Map<string, string>,
  workspaceNameByPath?: Map<string, string>,
): SearchResult {
  if (!result.workspaceId) {
    return result;
  }
  const workspaceName = workspaceNameById.get(result.workspaceId)
    ?? workspaceNameByPath?.get(result.workspaceId);
  if (!workspaceName) {
    return result;
  }
  return {
    ...result,
    workspaceName,
  };
}

export function useUnifiedSearch({
  query,
  contentFilters,
  workspaceSources,
  kanbanTasks,
  threadItemsByThread,
  historyItems,
  skills,
  commands,
  activeWorkspaceId,
  maxResults = SEARCH_TOTAL_LIMIT,
  workspaceNameByPath,
}: UseUnifiedSearchOptions) {
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [recencyMap] = useState(() => loadSearchRecencyMap());

  useEffect(() => {
    if (!query.trim()) {
      setDebouncedQuery("");
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const computedResults = useMemo(() => {
    return computeUnifiedSearchResults({
      query: debouncedQuery,
      contentFilters,
      workspaceSources,
      kanbanTasks,
      threadItemsByThread,
      historyItems,
      skills,
      commands,
      activeWorkspaceId,
      maxResults,
      recencyMap,
      reportMetrics: true,
      workspaceNameByPath,
    });
  }, [
    debouncedQuery,
    historyItems,
    kanbanTasks,
    maxResults,
    contentFilters,
    commands,
    skills,
    activeWorkspaceId,
    threadItemsByThread,
    workspaceSources,
    workspaceNameByPath,
    recencyMap,
  ]);

  return computedResults;
}

export function computeUnifiedSearchResults({
  query,
  contentFilters,
  workspaceSources,
  kanbanTasks,
  threadItemsByThread,
  historyItems,
  skills,
  commands,
  activeWorkspaceId,
  maxResults = SEARCH_TOTAL_LIMIT,
  recencyMap,
  reportMetrics = false,
  workspaceNameByPath,
}: ComputeUnifiedSearchOptions): SearchResult[] {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [] as SearchResult[];
  }

  const startedAt = performance.now();
  const recentOpenMap = recencyMap ?? loadSearchRecencyMap();
  const providerTimings: Array<{
    provider: string;
    elapsedMs: number;
    candidateCount: number;
    resultCount: number;
  }> = [];
  const workspaceNameById = new Map(
    workspaceSources.map((source) => [source.workspaceId, source.workspaceName]),
  );

  const merged: SearchResult[] = [];
  const collectProviderResults = (
    provider: string,
    candidateCount: number,
    limit: number,
    searchProvider: () => SearchResult[],
  ) => {
    const providerStartedAt = performance.now();
    const results = takeLimited(searchProvider(), limit);
    providerTimings.push({
      provider,
      elapsedMs: Math.round(performance.now() - providerStartedAt),
      candidateCount,
      resultCount: results.length,
    });
    merged.push(...results);
  };

  for (const source of workspaceSources) {
    if (shouldIncludeSection(contentFilters, "files")) {
      collectProviderResults(
        "files",
        source.files.length,
        Math.max(8, Math.floor(SEARCH_PROVIDER_LIMITS.files / Math.max(workspaceSources.length, 1))),
        () => searchFiles(normalizedQuery, source.files, source.workspaceId),
      );
    }
    if (shouldIncludeSection(contentFilters, "threads")) {
      collectProviderResults(
        "threads",
        source.threads.length,
        Math.max(8, Math.floor(SEARCH_PROVIDER_LIMITS.threads / Math.max(workspaceSources.length, 1))),
        () => searchThreads(normalizedQuery, source.threads, source.workspaceId),
      );
    }
    if (shouldIncludeSection(contentFilters, "messages")) {
      const messageCandidateCount = source.threads.reduce(
        (count, thread) => count + (threadItemsByThread[thread.id]?.length ?? 0),
        0,
      );
      collectProviderResults(
        "messages",
        messageCandidateCount,
        Math.max(8, Math.floor(SEARCH_PROVIDER_LIMITS.messages / Math.max(workspaceSources.length, 1))),
        () =>
          searchMessages({
            query: normalizedQuery,
            workspaceId: source.workspaceId,
            threads: source.threads,
            threadItemsByThread,
          }),
      );
    }
  }

  if (shouldIncludeSection(contentFilters, "kanban")) {
    collectProviderResults(
      "kanban",
      kanbanTasks.length,
      SEARCH_PROVIDER_LIMITS.kanban,
      () => searchKanbanTasks(normalizedQuery, kanbanTasks),
    );
  }
  if (shouldIncludeSection(contentFilters, "history")) {
    collectProviderResults(
      "history",
      historyItems.length,
      SEARCH_PROVIDER_LIMITS.history,
      () => searchHistory(normalizedQuery, historyItems),
    );
  }
  if (shouldIncludeSection(contentFilters, "skills")) {
    collectProviderResults(
      "skills",
      skills.length,
      SEARCH_PROVIDER_LIMITS.skills,
      () => searchSkills(normalizedQuery, skills, activeWorkspaceId),
    );
  }
  if (shouldIncludeSection(contentFilters, "commands")) {
    collectProviderResults(
      "commands",
      commands.length,
      SEARCH_PROVIDER_LIMITS.commands,
      () => searchCommands(normalizedQuery, commands),
    );
  }

  const withScopeLabel = merged.map((entry) => attachWorkspaceLabel(entry, workspaceNameById, workspaceNameByPath));
  withScopeLabel.sort((a, b) => compareSearchResults(a, b, recentOpenMap));
  const sliced = withScopeLabel.slice(0, maxResults);

  if (reportMetrics) {
    reportSearchMetrics({
      query: normalizedQuery,
      elapsedMs: Math.round(performance.now() - startedAt),
      resultCount: sliced.length,
      providerTimings,
      hydrationState: workspaceSources.length <= 1 ? "active-only" : "partial-global",
      staleDropCount: 0,
    });
  }

  return sliced;
}

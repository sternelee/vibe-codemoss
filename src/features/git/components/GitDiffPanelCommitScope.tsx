import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeGitPath } from "../utils/commitScope";

type GitCommitSelectionFile = {
  path: string;
};

type UseGitCommitSelectionOptions = {
  stagedFiles: GitCommitSelectionFile[];
  unstagedFiles: GitCommitSelectionFile[];
};

type CommitSelectionState = {
  overrides: Record<string, boolean>;
  hasExplicitCommitSelection: boolean;
  topologyKey: string;
};

export type CommitButtonProps = {
  commitMessage: string;
  selectedCount: number;
  hasAnyChanges: boolean;
  commitLoading: boolean;
  onCommit?: (selectedPaths?: string[]) => void | Promise<void>;
  selectedPaths: string[];
};

export function CommitButton({
  commitMessage,
  selectedCount,
  hasAnyChanges,
  commitLoading,
  onCommit,
  selectedPaths,
}: CommitButtonProps) {
  const { t } = useTranslation();
  const hasMessage = commitMessage.trim().length > 0;
  const canCommit = hasMessage && selectedCount > 0 && !commitLoading;

  return (
    <div className="commit-button-container">
      <button
        type="button"
        className="commit-button"
        onClick={() => {
          if (canCommit) {
            void onCommit?.(selectedPaths);
          }
        }}
        disabled={!canCommit}
        title={
          !hasMessage
            ? t("git.enterCommitMessage")
            : selectedCount === 0 && hasAnyChanges
              ? t("git.selectFilesToCommit")
              : !hasAnyChanges
                ? t("git.noChangesToCommit")
                : t("git.commitSelectedChanges")
        }
      >
        {commitLoading ? (
          <span className="commit-button-spinner" aria-hidden />
        ) : (
          <svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
        <span>{commitLoading ? t("git.committing") : t("git.commit")}</span>
      </button>
    </div>
  );
}

export function useGitCommitSelection({
  stagedFiles,
  unstagedFiles,
}: UseGitCommitSelectionOptions) {
  const allFiles = useMemo(
    () => [
      ...stagedFiles.map((file) => ({ ...file, section: "staged" as const })),
      ...unstagedFiles.map((file) => ({ ...file, section: "unstaged" as const })),
    ],
    [stagedFiles, unstagedFiles],
  );

  const orderedCommitPaths = useMemo(() => {
    const seenPaths = new Set<string>();
    const paths: string[] = [];
    for (const file of allFiles) {
      const normalizedPath = normalizeGitPath(file.path);
      if (seenPaths.has(normalizedPath)) {
        continue;
      }
      seenPaths.add(normalizedPath);
      paths.push(normalizedPath);
    }
    return paths;
  }, [allFiles]);

  const rawCommitPathByNormalizedPath = useMemo(() => {
    const pathMap = new Map<string, string>();
    for (const file of allFiles) {
      const normalizedPath = normalizeGitPath(file.path);
      if (!pathMap.has(normalizedPath)) {
        pathMap.set(normalizedPath, file.path);
      }
    }
    return pathMap;
  }, [allFiles]);

  const stagedPathSet = useMemo(
    () => new Set(stagedFiles.map((file) => normalizeGitPath(file.path))),
    [stagedFiles],
  );
  const unstagedPathSet = useMemo(
    () => new Set(unstagedFiles.map((file) => normalizeGitPath(file.path))),
    [unstagedFiles],
  );
  const lockedHybridPathSet = useMemo(() => {
    const hybridPaths = new Set<string>();
    for (const path of stagedPathSet) {
      if (unstagedPathSet.has(path)) {
        hybridPaths.add(path);
      }
    }
    return hybridPaths;
  }, [stagedPathSet, unstagedPathSet]);

  const selectionTopologyKey = useMemo(
    () =>
      JSON.stringify({
        orderedCommitPaths,
        stagedPaths: Array.from(stagedPathSet).sort(),
        lockedHybridPaths: Array.from(lockedHybridPathSet).sort(),
      }),
    [lockedHybridPathSet, orderedCommitPaths, stagedPathSet],
  );

  const [commitSelectionState, setCommitSelectionState] =
    useState<CommitSelectionState>(() => ({
      overrides: {},
      hasExplicitCommitSelection: false,
      topologyKey: selectionTopologyKey,
    }));

  const commitSelectionOverrides = commitSelectionState.overrides;

  const countSelectedCommitPaths = useCallback(
    (overrides: Record<string, boolean>) =>
      orderedCommitPaths.filter((path) => {
        if (lockedHybridPathSet.has(path)) {
          return true;
        }
        const override = overrides[path];
        if (typeof override === "boolean") {
          return override;
        }
        return stagedPathSet.has(path);
      }).length,
    [lockedHybridPathSet, orderedCommitPaths, stagedPathSet],
  );

  const isCommitPathLocked = useCallback(
    (path: string) => lockedHybridPathSet.has(normalizeGitPath(path)),
    [lockedHybridPathSet],
  );

  const isCommitPathSelected = useCallback(
    (path: string) => {
      const normalizedPath = normalizeGitPath(path);
      if (lockedHybridPathSet.has(normalizedPath)) {
        return true;
      }
      const override = commitSelectionOverrides[normalizedPath];
      if (typeof override === "boolean") {
        return override;
      }
      return stagedPathSet.has(normalizedPath);
    },
    [commitSelectionOverrides, lockedHybridPathSet, stagedPathSet],
  );

  const setCommitSelection = useCallback(
    (paths: string[], selected: boolean) => {
      const normalizedPaths = Array.from(
        new Set(paths.map((path) => normalizeGitPath(path))),
      ).filter((path) => !lockedHybridPathSet.has(path));
      if (normalizedPaths.length === 0) {
        return;
      }
      setCommitSelectionState((previous) => {
        const nextOverrides = { ...previous.overrides };
        for (const normalizedPath of normalizedPaths) {
          const defaultSelected = stagedPathSet.has(normalizedPath);
          if (selected === defaultSelected) {
            delete nextOverrides[normalizedPath];
            continue;
          }
          nextOverrides[normalizedPath] = selected;
        }
        const nextSelectedCount = countSelectedCommitPaths(nextOverrides);
        return {
          overrides: nextOverrides,
          hasExplicitCommitSelection:
            nextSelectedCount === 0
              ? true
              : Object.keys(nextOverrides).length > 0,
          topologyKey: selectionTopologyKey,
        };
      });
    },
    [
      countSelectedCommitPaths,
      lockedHybridPathSet,
      selectionTopologyKey,
      stagedPathSet,
    ],
  );

  const selectedCommitPaths = useMemo(
    () =>
      orderedCommitPaths
        .filter((path) => isCommitPathSelected(path))
        .map((path) => rawCommitPathByNormalizedPath.get(path) ?? path),
    [isCommitPathSelected, orderedCommitPaths, rawCommitPathByNormalizedPath],
  );
  const includedCommitPaths = useMemo(
    () => orderedCommitPaths.filter((path) => isCommitPathSelected(path)),
    [isCommitPathSelected, orderedCommitPaths],
  );
  const excludedCommitPaths = useMemo(
    () =>
      orderedCommitPaths.filter(
        (path) => !lockedHybridPathSet.has(path) && !isCommitPathSelected(path),
      ),
    [isCommitPathSelected, lockedHybridPathSet, orderedCommitPaths],
  );
  const partialCommitPaths = useMemo(
    () => Array.from(lockedHybridPathSet),
    [lockedHybridPathSet],
  );

  useEffect(() => {
    setCommitSelectionState((previous) => {
      const validPaths = new Set(
        orderedCommitPaths.filter((path) => !lockedHybridPathSet.has(path)),
      );
      const nextOverrides: Record<string, boolean> = {};
      let didChange = false;
      for (const [path, value] of Object.entries(previous.overrides)) {
        if (validPaths.has(path)) {
          nextOverrides[path] = value;
          continue;
        }
        didChange = true;
      }
      const topologyChanged = previous.topologyKey !== selectionTopologyKey;
      const nextSelectedCount = countSelectedCommitPaths(nextOverrides);
      const nextHasExplicitCommitSelection =
        nextSelectedCount === 0
          ? !topologyChanged && !didChange && previous.hasExplicitCommitSelection
          : Object.keys(nextOverrides).length > 0;
      if (
        !didChange &&
        !topologyChanged &&
        previous.hasExplicitCommitSelection === nextHasExplicitCommitSelection
      ) {
        return previous;
      }
      return {
        overrides: nextOverrides,
        hasExplicitCommitSelection: nextHasExplicitCommitSelection,
        topologyKey: selectionTopologyKey,
      };
    });
  }, [countSelectedCommitPaths, lockedHybridPathSet, orderedCommitPaths, selectionTopologyKey]);

  return {
    selectedCommitPaths,
    selectedCommitCount: selectedCommitPaths.length,
    hasExplicitCommitSelection: commitSelectionState.hasExplicitCommitSelection,
    includedCommitPaths,
    excludedCommitPaths,
    partialCommitPaths,
    isCommitPathLocked,
    setCommitSelection,
  };
}

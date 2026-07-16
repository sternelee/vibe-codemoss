import { useCallback, useEffect, useState } from "react";

import {
  getClientStoreSync,
  writeClientStoreValue,
} from "../../../services/clientStorage";

// 用户在工作区「...」菜单里勾选后，回到项目名那一行外显的动作 id 列表。
export const SIDEBAR_WORKSPACE_PINNED_ACTIONS_KEY =
  "sidebarWorkspacePinnedActions";
export const SIDEBAR_WORKSPACE_PINNED_ACTIONS_CHANGED_EVENT =
  "sidebarWorkspacePinnedActionsChanged";

// 允许 pin 回项目行的动作（对应 54b0c100 之前那几个内联按钮）。
// 其余菜单项（重命名 / 删除 / worktree / clone）不出勾选框。
export const PINNABLE_WORKSPACE_ACTION_IDS = [
  "activate-workspace",
  "reload-threads",
  "toggle-exited-sessions",
  "create-session-folder",
] as const;

export function readSidebarWorkspacePinnedActionIds(): string[] {
  const stored = getClientStoreSync<unknown>(
    "app",
    SIDEBAR_WORKSPACE_PINNED_ACTIONS_KEY,
  );
  return Array.isArray(stored)
    ? stored.filter((id): id is string => typeof id === "string")
    : [];
}

// 写入即广播，读侧靠内容比较守卫，不做轮询（遵守根渲染红线）。
export function toggleSidebarWorkspacePinnedActionId(id: string): string[] {
  const current = readSidebarWorkspacePinnedActionIds();
  const next = current.includes(id)
    ? current.filter((pinnedId) => pinnedId !== id)
    : [...current, id];
  writeClientStoreValue("app", SIDEBAR_WORKSPACE_PINNED_ACTIONS_KEY, next);
  window.dispatchEvent(
    new CustomEvent<string[]>(SIDEBAR_WORKSPACE_PINNED_ACTIONS_CHANGED_EVENT, {
      detail: next,
    }),
  );
  return next;
}

/**
 * 侧栏「工作区行外显动作」的共享状态。菜单勾选框与项目行按钮各自订阅同一事件，
 * 保持同步而无需把状态穿过 useSidebarMenus 的巨型参数表。
 */
export function useSidebarWorkspacePinnedActions() {
  const [pinnedIds, setPinnedIds] = useState<string[]>(() =>
    readSidebarWorkspacePinnedActionIds(),
  );
  const togglePinned = useCallback((id: string) => {
    setPinnedIds(toggleSidebarWorkspacePinnedActionId(id));
  }, []);
  useEffect(() => {
    const handleChanged = (event: Event) => {
      const next = (event as CustomEvent<unknown>).detail;
      if (Array.isArray(next)) {
        setPinnedIds(next.filter((id): id is string => typeof id === "string"));
      }
    };
    window.addEventListener(
      SIDEBAR_WORKSPACE_PINNED_ACTIONS_CHANGED_EVENT,
      handleChanged,
    );
    return () => {
      window.removeEventListener(
        SIDEBAR_WORKSPACE_PINNED_ACTIONS_CHANGED_EVENT,
        handleChanged,
      );
    };
  }, []);
  return { pinnedIds, togglePinned };
}

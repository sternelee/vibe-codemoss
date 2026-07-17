# Refine Git Graph Menu Entry

## OpenSpec

- Change: `refine-git-graph-menu-entry`
- Source of truth: `openspec/changes/refine-git-graph-menu-entry/`

## Goal

收敛 Git Diff mode menu 的提交历史入口：把 `Hub` 改为 `Git Graph` 并使用 `GitCommitHorizontal`，同时仅在该 dropdown 的 UI 层隐藏旧 `Git` option。

## Requirements

- 保留 `log` mode 类型、metadata、render branch 与所有非菜单调用路径。
- 保留 `onOpenGitHistoryPanel` callback 语义。
- 不修改 backend、Tauri command、Git state、routing 或 persistence。
- 所有 locale 使用 technical term `Git Graph`。
- Sidebar settings menu 使用相同 `Git Graph` 文案与 `GitCommitHorizontal` icon。
- Git Diff menu 的 `Git Graph` label 使用 bold + theme accent，icon 使用同一 accent。

## Acceptance Criteria

- [ ] dropdown 不显示旧 `Git` (`log`) option。
- [ ] dropdown 显示 `Git Graph` 且 icon 为 `GitCommitHorizontal`。
- [ ] 点击 `Git Graph` 调用原 callback 一次。
- [ ] Sidebar settings action 保持原 callback/active state，只统一 presentation。
- [ ] Git Diff menu 仅强化 `Git Graph` item，不影响相邻菜单项。
- [ ] focused Vitest、typecheck 与 strict OpenSpec validation 通过。

## Technical Notes

只在 `modeOptions` 的 menu render boundary 过滤 `log`，不从 metadata source 删除该 option，避免外部入口激活 `mode="log"` 时 trigger fallback 为 `diff`。

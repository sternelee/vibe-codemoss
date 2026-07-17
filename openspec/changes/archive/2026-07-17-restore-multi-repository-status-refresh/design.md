## Context

`GitDiffPanel` 在 single-repository mode 通过 `.git-status-refresh-button` 暴露手动刷新入口。multi-repository mode 改由 `GitMultiRepositoryChanges` 渲染 repository groups；父层已经传入 aggregate `onRefreshRepositoryStatuses` 与 `repositoryStatusesLoading`，但 group header 没有消费这两个 props，因此 UI parity 断裂。

## Goals / Non-Goals

**Goals:**

- 在 multi-repository repository header 恢复与单仓一致的 refresh affordance。
- 复用现有 aggregate status refresh path、icon、i18n 和 style contract。
- 使用 focused regression test 锁定每仓入口、callback 与 in-flight guard。

**Non-Goals:**

- 不改变 `useMultiRepositoryGitStatus.refresh()` 的 signature 或 dirty repository filtering。
- 不新增 repository-scoped IPC / backend command。
- 不改变 automatic polling cadence。

## Decisions

### Decision 1: header-local affordance，aggregate refresh semantics

每个 repository header 渲染 refresh button，但点击继续调用现有无参数 `onRefresh`。这与 multi-repository status 作为一个 aggregate snapshot 的现有 contract 一致，并能捕获所有 dirty repositories 的外部变化。

备选方案是把 `repositoryRoot` 贯穿 AppShell、layout types 与 hook，只刷新单仓。该方案会制造新的 partial snapshot merge 与 stale topology 边界，而用户需求仅要求恢复入口，因此不采用。

### Decision 2: loading state 作为并发 gate

button 使用现有 `isLoading` prop 添加 spinning class 与 `disabled`。不复制 single-repository 中固定 520ms timer；multi-repository hook 已有真实 async loading state，直接绑定能更准确表达请求生命周期。

### Decision 3: 复用现有 visual / accessibility contract

继续使用 `RefreshCw`、`.git-status-refresh-button`、`git.refreshStatus`。新增 group-local wrapper 只负责 header hover / focus reveal，避免新增 i18n key 或平行按钮组件。

## Risks / Trade-offs

- [Risk] 每个 header 都有入口，但任一点击会刷新整个 aggregate snapshot，可能被理解为仅刷新当前仓。→ Mitigation：沿用通用 `Refresh Git status` label，不使用 repository-scoped wording；这是现有 callback 的真实语义。
- [Risk] header 增加一列后窄面板可能挤压 repository name。→ Mitigation：refresh action 使用 fixed 20px，repository name 保持 `minmax(0, 1fr)` 与 ellipsis。
- [Risk] loading 时所有 header button 同时 spinning。→ Mitigation：这准确反映 aggregate refresh 正在更新全部 repository statuses。

## Migration Plan

1. 增加 header refresh action 与 focused tests。
2. 运行 Vitest、typecheck、OpenSpec strict validation 与 diff check。
3. 回滚时删除新增 JSX / CSS / tests；callback、hook 与 backend 无需迁移。

## Open Questions

无。若未来明确需要 repository-scoped refresh，应单独设计 partial snapshot merge 与 repository topology refresh contract。

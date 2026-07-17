## Why

Git Diff 面板在 single-repository mode 已提供手动 Git status refresh，但切换到 multi-repository mode 后 repository header 没有对应入口。刷新 callback 与 status loading state 已经贯通，仅 UI affordance 丢失，导致多仓用户无法主动拉取最新变更状态。

## 目标与边界

- 在每个 multi-repository change group header 恢复可访问的 refresh icon button。
- 点击任一入口复用现有 aggregate repository status refresh callback。
- refresh 期间展示 loading state，并避免重复提交相同刷新请求。
- 保持现有 automatic polling、Git bridge、stage / unstage / discard / commit 行为不变。

## 非目标

- 不新增 repository-scoped backend command 或 Git network operation。
- 不改变 multi-repository discovery、dirty repository filtering 或 polling cadence。
- 不重构 single-repository header 与 multi-repository header 的整体结构。

## What Changes

- 在 `GitMultiRepositoryChanges` 的每个 repository header 增加手动 refresh action。
- 复用 `onRefresh`、`isLoading`、现有 `RefreshCw` icon、i18n label 与 button visual contract。
- 增加 focused component tests，覆盖入口可见性、callback 调用与 loading guard。
- 扩展 `git-panel-diff-view` capability，明确 multi-repository mode 的 refresh parity。

## 技术方案对比

1. **复用 aggregate refresh callback（采用）**：每个 header 的入口调用现有 `onRefresh`，不改变 callback signature 与 hook contract；改动小，且与当前多仓 status snapshot 的整体刷新语义一致。
2. **新增 repository-scoped refresh**：给 callback 增加 `repositoryRoot` 并改造 hook 只刷新单仓；会扩大 AppShell、layout types 与 stale topology 处理范围，而当前需求没有要求改变刷新粒度。

## 验收标准

- multi-repository mode 下每个 repository header 都能看到或通过 keyboard focus 发现 refresh button。
- button 具有现有 Git status refresh accessible label 与 tooltip。
- 点击 button 只调用现有 `onRefresh`，不新增 backend command。
- refresh in flight 时按钮进入 loading state，重复点击不会发起新请求。
- focused Vitest、TypeScript typecheck、OpenSpec strict validation 与 `git diff --check` 通过。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `git-panel-diff-view`: 将手动 Git status refresh affordance 扩展到 multi-repository repository headers，并继续复用现有 aggregate refresh path。

## Impact

- Frontend component: `src/features/git/components/GitMultiRepositoryChanges.tsx`
- Frontend tests: `src/features/git/components/GitMultiRepositoryChanges.test.tsx`
- Styling: `src/styles/diff.css`
- Behavior spec: `openspec/specs/git-panel-diff-view/spec.md` 的 change-local delta
- API / backend / dependencies: 无变化

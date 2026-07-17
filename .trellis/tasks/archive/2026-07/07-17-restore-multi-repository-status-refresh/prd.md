# 恢复 Git 多仓状态刷新入口

## OpenSpec Change

`restore-multi-repository-status-refresh`

## Goal

让 Git Diff multi-repository mode 与 single-repository mode 保持手动 status refresh 入口一致。

## Requirements

- 每个 repository change group header 渲染 accessible refresh icon button。
- 点击复用现有 aggregate `onRefresh` callback，不新增 backend command。
- refresh in flight 时展示 loading state，并阻止重复请求。
- 保持 automatic polling 与其他 Git actions 不变。

## Acceptance Criteria

- [ ] 每个 repository header 可通过鼠标与 keyboard 发现刷新按钮。
- [ ] 点击任一按钮调用一次 aggregate refresh callback。
- [ ] `isLoading` 时按钮 disabled 且显示 spinning state。
- [ ] focused Vitest、typecheck、OpenSpec strict validation 与 diff check 通过。

## Technical Notes

复用 `RefreshCw`、`.git-status-refresh-button`、`git.refreshStatus` 与既有 `onRefresh` / `isLoading` props；不改变 hook、layout types 或 IPC contract。

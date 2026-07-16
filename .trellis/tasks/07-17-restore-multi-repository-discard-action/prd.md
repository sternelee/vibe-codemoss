# 恢复多仓 Git 文件回退入口

## OpenSpec

- Change: `restore-multi-repository-discard-action`
- Source: `openspec/changes/restore-multi-repository-discard-action/`

## 背景

多仓 Git 列表没有转发 discard callback，导致 unstaged file row 缺少共享的 `Undo2` 回退 action。现有 Tauri service 已支持 `repositoryRoot` scope，本任务只补齐 frontend interaction chain。

## 目标

- 仅为 multi-repository unstaged rows 恢复回退 icon。
- 复用现有 confirmation dialog；cancel no-op，confirm 后 scoped revert。
- 以 `repositoryRoot + path` 隔离同名 relative path。
- 成功后刷新 multi-repository statuses。

## 非目标

- 不改变 backend Git behavior。
- 不修改 staged row、commit/push、selection 或 preview behavior。
- 不引入跨仓库 transaction。

## 验收

- Focused component tests 覆盖 icon visibility、confirm、cancel 与同路径跨仓库隔离。
- `npm run typecheck`、目标 lint、OpenSpec strict validation 通过。
- dirty worktree 中只对目标 hunk 做 semantic patch，不覆盖用户已有修改。

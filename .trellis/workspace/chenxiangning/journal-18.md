# Journal - chenxiangning (Part 18)

> Continuation from `journal-17.md` (archived at ~2000 lines)
> Started: 2026-06-01

---



## Session 652: 收口会话恢复 Fork 入口

**Date**: 2026-06-01
**Task**: 收口会话恢复 Fork 入口
**Branch**: `feature/v0.5.4`

### Summary

将 Codex stale thread recovery 卡片的 Fork 并重发收口为纯 Fork，并回写 OpenSpec 变更记录。

### Main Changes

## Session Summary

- 将 Codex stale thread recovery 卡片主按钮从 `Fork 并重发` / `Fork and resend` 改为纯 `Fork`。
- 新增 `onThreadRecoveryFork` 传递链，复用现有 `startFork("/fork")` 能力，不重新实现 fork。
- 保留非 stale runtime reconnect/resend 行为；stale thread Fork 不再调用 `ensureRuntimeReady` 或 `onRecoverThreadRuntimeAndResend`。
- 更新 i18n 与 focused reconnect card 测试契约。
- 新增 OpenSpec change `fix-thread-recovery-fork-shortcut`，记录 proposal/tasks/spec delta。

## Validation

- 未运行测试或 OpenSpec validate；本轮按用户要求先提交收口。

## Notes

- 工作区仍存在提交前已识别的无关未提交改动：daemon/thread listing/engine hooks 与 `openspec/changes/fix-git-change-canonical-model/`，本次提交未纳入。


### Git Commits

| Hash | Message |
|------|---------|
| `e450586e` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete

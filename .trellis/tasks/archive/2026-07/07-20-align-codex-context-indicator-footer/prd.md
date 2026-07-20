# 对齐 Codex Context Indicator Footer

## Goal

将 Codex 对话框的 context usage indicator 移到与 Claude Code 相同的输入框下方右侧位置，并统一 percentage 与圆环外观；保留现有 usage、tooltip 和 compaction 逻辑。

## OpenSpec

- Change: `align-codex-context-indicator-footer`
- Source: `openspec/changes/align-codex-context-indicator-footer/`

## Requirements

- Codex dual usage summary 使用 `.composer-branch-row-usage` footer slot。
- percentage 在左，圆环在右，尺寸、stroke、颜色和间距与 Claude Code 一致。
- 复用现有 Codex tooltip、manual compaction、auto-compaction settings 和 lifecycle status。
- Claude Code、HomeChat 与其他 provider behavior 不变。
- 不新增 dependency、state、effect 或 runtime contract。

## Acceptance Criteria

- [ ] Codex indicator 不再显示在输入框内部工具栏。
- [ ] Codex indicator 位于输入框下方右侧，与 Claude Code 对齐。
- [ ] percentage/ring presentation 与 Claude Code 一致。
- [ ] Codex tooltip 与 compaction controls 保持可用。
- [ ] Focused tests、TypeScript、ESLint 和 OpenSpec strict validation 通过。

## Technical Notes

- 复用现有 `ContextBar`，不复制或重写 Codex summary logic。
- 共享 ai-elements context ring presentation primitive。
- 当前 working tree 中 note-capture 相关改动不属于本任务，禁止修改或纳入验证修复。

## Out of Scope

- Usage percentage 或 token snapshot 计算。
- Backend/runtime、settings schema、i18n copy。
- 非 Composer usage surface。

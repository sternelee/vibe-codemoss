# 幕布底部便签菜单触发按钮

## Goal

在对话幕布最底部最新 final message 的现有 action group 中增加便签 icon，点击后打开现有 conversation note capture menu。

## Requirements

- 复用 `useConversationNoteCaptureMenu` 的菜单构建与 `NoteCaptureDraft` 路由。
- 新按钮仅出现在当前幕布最底部、最新 final assistant message 的 action group。
- action 顺序为 Note、Copy、Fork、Rewind。
- Note icon 使用 `9px` 与 `1.75` stroke width；History 单独调整为 `13px`；Copy 与 Fork 保持原有视觉尺寸与样式。
- 原有右键入口、Copy、Fork、Rewind 与菜单内容保持不变。
- 使用现有 icon dependency、button 样式与 i18n 文案，不新增 dependency；仅增加 History icon 的 scoped CSS 尺寸覆盖。

## Acceptance Criteria

- [x] 最新 final action group 从 3 个按钮增加为 4 个按钮，Note 位于最左侧。
- [x] Note icon 使用 `9px` 与 `1.75` stroke width，History 使用 `13px`，Copy 与 Fork 的尺寸和样式不变。
- [x] 点击便签 icon 后显示现有“保存到便签”菜单。
- [x] 点击“将语义对话正文保存到便签…”继续产生原有 semantic thread draft。
- [x] 旧 final boundary 不增加便签 icon。
- [x] 幕布右键相关回归测试保持通过。

## Technical Notes

- 关联 OpenSpec change：`unify-source-aware-note-capture-workbench`。
- 将 menu-opening action 从右键 event adapter 中提取为 shared hook action；右键与 icon 只作为两个 trigger adapter。
- 不修改 persistence、layout routing、semantic transcript policy 或 streaming render contract。

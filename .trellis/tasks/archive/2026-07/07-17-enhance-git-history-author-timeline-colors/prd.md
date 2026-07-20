# Enhance Git History Author Timeline Colors

## OpenSpec Change

- `openspec/changes/enhance-git-history-author-timeline-colors/`

## Goal

增强 Git History 中栏 commit list 的时间线辨识度，让不同 author identity 获得稳定、主题兼容的颜色，同时保留现有 selection、hover、virtualization 与 metadata 语义。

## Requirements

- identity 使用 normalized `authorEmail || author`，缺失 identity 进入固定 fallback。
- 使用 deterministic hash 映射到有限、经主题校准的 palette。
- graph dot 使用 author accent，line segment 使用同色弱化色，author label 使用可读同源色。
- 映射不得依赖 row position、分页顺序、筛选顺序或 virtualizer lifecycle。
- 不修改 backend/API，不新增依赖，不给整行增加 author background。

## Acceptance Criteria

- [ ] 同一 author identity 在不同 rows 和列表生命周期中使用相同 palette slot。
- [ ] 已知不同 identity fixtures 使用不同 palette slots。
- [ ] 缺失 email/name 时 fallback 行为稳定。
- [ ] commit row 投影 author palette class，CSS 正确驱动 dot、line 和 author label。
- [ ] selected row background 与 keyboard/mouse interaction 保持原语义。
- [ ] focused Vitest、typecheck、lint、large-file gate 与 strict OpenSpec validation 通过。

## Technical Notes

- feature-local pure utility，使用 FNV-1a + eight-slot palette。
- palette color values 留在 `src/styles/git-history.part1.css`，JSX 只投影 slot class。
- OpenSpec `git-commit-history` delta 是行为 single source of truth。

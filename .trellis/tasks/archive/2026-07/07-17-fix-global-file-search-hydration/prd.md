# 修复全局文件搜索 hydration

## Goal

修复搜索面板无法召回 Composer `@` 可找到的嵌套 workspace 文件。

## OpenSpec

- Change: `fix-global-file-search-hydration`
- Source of truth: `openspec/changes/fix-global-file-search-hydration/`

## Requirements

- 区分 shallow、loading、complete、partial、error 文件 snapshot。
- 当前与全局 scope 均可 bounded hydrate full workspace snapshot。
- active workspace 优先，并发最多 2，复用 in-flight/completed cache。
- hydration failure 可重试，stale response 不得覆盖新状态。
- partial/error 不得显示为确定性的零结果。

## Acceptance Criteria

- [ ] 当前与全局 scope 均可找到 full snapshot 中的嵌套文件。
- [ ] shallow/empty cache 不阻止 hydration。
- [ ] 连续 query 不重复调用 full listing。
- [ ] partial/error 有可见状态。
- [ ] focused tests、typecheck、lint、OpenSpec strict validation 通过。

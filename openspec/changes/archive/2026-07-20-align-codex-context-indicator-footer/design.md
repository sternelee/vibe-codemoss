## Context

Composer 当前存在两条 context usage presentation path：

- Claude Code 使用 `TokenIndicator`，由 `Composer` 放在输入框下方 `.composer-branch-row-usage`。
- Codex dual-view 使用 `ContextBar` 内的 `.context-dual-usage`，由 `ChatInputBox` 放在输入框内部 `ButtonArea.mainSurface`。

两者读取的数据源不同且各有语义：Codex summary 还承载 manual compaction、auto-compaction settings 和 lifecycle status。因此目标不是把 Codex 替换成 Claude component，而是让 Codex 原组件进入同一 footer slot，并共享同一 visual primitive。

## Goals / Non-Goals

**Goals:**

- Codex 与 Claude Code context indicator 使用同一 Composer footer placement。
- Codex 使用与 Claude Code 相同的 percentage-first、ring-second 视觉结构。
- 保留 Codex `ContextBar` 的 derived summary、tooltip、compaction state 与 callbacks。
- 删除不再需要的 `ChatInputBox` dual-usage prop chain，避免同一 snapshot 同时订阅内外两条 render path。

**Non-Goals:**

- 不调整 usage 计算、clamping、snapshot freshness 或 compaction lifecycle。
- 不新增 state、effect、dependency 或 runtime event。
- 不改变 HomeChat、Claude Code 和其他 provider 的 visibility contract。

## Decisions

### 1. 在 `Composer` canonical footer row 渲染现有 Codex `ContextBar`

`Composer` 已拥有 `resolvedDualContextUsage`、manual compaction handler 与 auto-compaction settings callbacks。直接在 `.composer-branch-row-usage` 渲染现有 `ContextBar`，可保留全部行为，同时与 Claude Code 共享真实布局容器。

备选的 CSS absolute positioning 会绕过正常 document flow，并依赖输入框高度和 branch badge；不采用。

### 2. 共享 context ring SVG primitive

把 ai-elements 内现有 ring icon 提炼为接受 `usedPercent` 的 presentation component：

- `TokenIndicator` 继续通过 `ContextTrigger` 使用它。
- Codex dual summary 传入既有、已 clamp 的 `barPercent`。

这样两套 indicator 得到完全相同的 stroke、尺寸和 track opacity，不复制 SVG，也不改变 percentage derivation。

### 3. 保持 provider 与 data gate 原样

`codexContextDualViewEnabled` 仍是 `contextDualViewEnabled && isCodexEngine`。Codex footer indicator 仅替换原 main toolbar surface；Claude Code 继续使用 `TokenIndicator`。不引入新的 feature flag 或 fallback calculation。

## Risks / Trade-offs

- [Risk] `ContextBar` 的 tool-popover 基础样式默认是 toolbar pill → 在 `.composer-branch-row-usage` 下增加 scoped override，只改变 root/ring/percentage presentation。
- [Risk] tooltip 从输入框内部移到 footer 后可能靠近 viewport 底部 → 保持 `bottom: calc(100% + 2px)` 向上展开，并用 focused DOM/CSS 与本地 visual check 验证。
- [Risk] 清理 `ChatInputBoxAdapter` dual props 可能遗漏 comparator/test → 通过 `rg` caller audit、focused adapter tests 与 `npm run typecheck` 验证。
- [Trade-off] 继续复用完整 `ContextBar` 会保留其中已有 hooks，而不是新建更小的 Codex-only component；这避免搬动业务逻辑，符合本次 presentation-only 边界。

## Migration Plan

1. 在 `Composer` footer row 接入现有 Codex `ContextBar`。
2. 从 `ChatInputBox` / adapter 移除已失去消费点的 dual summary props。
3. 统一 ring primitive 与 footer-scoped CSS。
4. 更新 focused tests，运行 strict validation、lint、typecheck 与 visual check。

Rollback 只需撤销上述 frontend/artifact 文件；无数据迁移、配置迁移或 backend rollback。

## Open Questions

无。用户截图与现有 Claude Code footer indicator 已明确目标外观和位置。

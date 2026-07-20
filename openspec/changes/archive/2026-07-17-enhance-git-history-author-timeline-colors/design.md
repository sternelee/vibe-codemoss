## Context

Git History 中栏由 `GitHistoryPanelView` 渲染 virtualized commit rows。每条 row 已包含 `author` 与 `authorEmail`，现有 graph dot 固定使用 `--accent-primary`，graph line 使用中性灰。这个改动不需要扩展 backend contract，但必须避免颜色随分页、搜索结果顺序或 virtualizer DOM 复用漂移。

约束：

- React 19 + TypeScript strict，现有 view 通过 `ActionSurface` 渲染 virtualized row。
- 样式集中在 `src/styles/git-history.part1.css`，需要兼容 light/dark/custom theme。
- selected/hover state 是交互反馈，author color 不能替代它。
- 颜色映射位于高频 render path，必须是无 allocation cache、O(identity length) 的纯函数。

## Goals / Non-Goals

**Goals:**

- 同一 author identity 在不同列表状态下获得稳定 palette slot。
- timeline dot、当前 row line segment 与 author label 形成克制的一致视觉编码。
- 有限 palette 在 light/dark surface 上保持可辨识度。
- 通过 unit test 固化 identity normalization 与 deterministic mapping，通过 component test 固化 row projection。

**Non-Goals:**

- 不表达 branch topology、merge lanes 或 commit ownership 权限。
- 不将 author color 扩展到 push preview、branch compare 与 details pane。
- 不引入 runtime theme color calculation 或第三方 color dependency。

## Decisions

### Decision 1: 使用 `authorEmail || author` 作为 identity

`authorEmail` 比 display name 更能区分同名提交者；缺失时回退到 `author`，全部缺失时进入固定 fallback slot。identity 在 hash 前执行 `trim().toLowerCase()`，避免大小写和首尾空白造成无意义分裂。

Alternative：只使用 `author`。实现更短，但同名作者无法区分，且 display name 变体更容易造成颜色漂移。

### Decision 2: 使用 FNV-1a 映射到 8 个 palette slots

FNV-1a 是小型、deterministic、无依赖的字符串 hash；输出只用于 UI 分桶，不承担安全用途。8 色 palette 将定义在 Git History CSS domain，通过 row class 选择 slot，不把颜色值硬编码进 JSX。

Alternative：动态 HSL。虽然可提供更多 hue，但难以保证所有生成色在当前 light/dark/custom surfaces 上都有一致对比度。

### Decision 3: author color 只作为辅助编码

graph dot 使用完整 accent，line 使用低混合比例，author label 将 accent 与 `--text-normal` 混合以保持可读性。selected row 继续使用现有 background，commit subject、SHA、time 不改色，因此颜色不是理解内容的唯一渠道。

Alternative：整行使用 author tint。区分更强，但会和 selection/hover background 争夺语义，也会使高密度历史列表显得噪声过高。

### Decision 4: 保持 virtualized row 的映射无状态

每次渲染根据 entry identity 直接计算 slot，不维护 “当前列表作者 → 颜色” Map。这样 virtualizer 复用、分页 append、query filter 都不会改变结果。

Alternative：按首次出现顺序维护 Map。它能减少当前 viewport 内碰撞，但会随加载与筛选顺序漂移，并引入额外 state lifecycle。

## Risks / Trade-offs

- [Risk] 作者数量超过 8 时可能发生 palette collision → 颜色仅作辅助编码，author text 始终保留；未来若实测需要，可扩大经过主题校准的 palette。
- [Risk] `authorEmail` 变化会让同一自然人显示不同颜色 → Git commit identity 本身已变化，当前 scope 不做跨邮箱身份合并。
- [Risk] line segment 在相邻不同作者处发生颜色切换 → 以 row 为边界的切换符合“当前提交归属”，dot 仍提供最强识别点。
- [Risk] custom theme surface 与固定 palette 的感知差异 → author label 通过 `color-mix` 与主题 text token 融合，核心信息不依赖颜色。

## Migration Plan

1. 新增纯函数与 unit test。
2. 在 commit row class 上投影 palette slot。
3. 增加 scoped CSS palette 与 timeline styles。
4. 扩展 component regression test 并执行 focused/full static gates。

Rollback 只需移除 row slot class、配色 utility 与相关 CSS；现有默认 graph colors 可直接恢复，不涉及数据迁移。

## Open Questions

- 无阻塞问题。palette collision 属于已接受的有限视觉编码 trade-off。

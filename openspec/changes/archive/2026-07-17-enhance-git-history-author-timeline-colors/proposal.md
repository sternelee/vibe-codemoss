## Why

Git History 提交列表当前所有 graph node 都使用统一蓝色，连续阅读大量提交时无法快速区分不同作者。现在需要让提交者成为可扫读的视觉维度，同时保持现有选中态、虚拟滚动和主题对比度不变。

## 目标与边界

- 为每个 commit author 生成跨刷新、分页和搜索稳定的 timeline accent。
- timeline node 使用作者主色，当前 row 的 line segment 使用同色弱化色，author label 使用可读的同源色。
- identity 优先使用 `authorEmail`，缺失时回退到 `author`，两者都缺失时使用统一 fallback。
- 仅调整 Git History 中栏 commit list，不改变详情、push preview、branch compare 或 backend payload。

## 非目标

- 不实现完整的 Git branch/merge graph 多轨布局。
- 不允许用户自定义作者颜色。
- 不为整条 commit row 增加作者背景色，也不改变现有 selected/hover state。
- 不新增依赖，不修改 Git history API 或数据模型。

## What Changes

- 引入 deterministic author identity → palette index 映射。
- 为虚拟化 commit row 注入 author accent CSS variable。
- 使用主题兼容的有限 palette 增强 graph dot、line segment 与 author label。
- 增加同作者稳定、不同作者区分和未知作者 fallback 的 focused regression coverage。

## 方案对比与取舍

1. **有限 palette + deterministic hash（采用）**：颜色可针对 light/dark theme 校准，identity 稳定且不会受列表顺序影响；代价是作者数量超过 palette 后允许碰撞。
2. **identity 直接生成任意 HSL hue（不采用）**：色相空间更大，但黄色、青色等在不同主题上的对比度难以稳定控制。
3. **按当前列表出现顺序分配颜色（不采用）**：实现简单，但分页、筛选或刷新会让同一作者颜色漂移，破坏视觉记忆。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `git-commit-history`: 扩展 commit graph and metadata row 的视觉 contract，使同一 author 获得稳定 timeline accent，不同 author 获得可区分 accent。

## 验收标准

- 同一 author identity 的可见 commit rows 使用相同 timeline accent。
- 两个映射到不同 palette slot 的 author identities 使用不同 timeline accent。
- `authorEmail` 缺失时仍可按 `author` 稳定映射；author 信息全部缺失时使用一致 fallback。
- virtualized rows 在刷新、分页与筛选后不因顺序变化而改变 author accent。
- selected row 继续使用现有 selection background，timeline accent 不覆盖交互态。
- focused Vitest、TypeScript typecheck、lint 与 strict OpenSpec validation 通过。

## Impact

- Frontend render: `src/features/git-history/components/git-history-panel/**`
- Styles: `src/styles/git-history.part1.css`
- Tests: `src/features/git-history/components/GitHistoryPanel.test.tsx` 及作者配色 utility test
- Behavior spec: `git-commit-history`
- API / backend / dependency: 无影响

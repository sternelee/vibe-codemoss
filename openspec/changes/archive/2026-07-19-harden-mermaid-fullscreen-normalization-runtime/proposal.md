## Why

Mermaid fullscreen 已通过 XML-safe serialization 修复复杂流程图的 `<img>` 解码失败，但当前 normalization 仍在 React render 中同步执行；大 SVG 遇到父层 rerender 时会重复承担 DOM parse、XML serialization 与 Base64 encoding 成本。serialization exception 同时被静默 fallback，无法区分正常兼容降级与原故障复发。

## 目标与边界

- 将 `svgToDataUrl(svg)` 从 JSX render expression 移到现有 fullscreen lifecycle effect。
- 使用 component-local single-entry cache，使同一 SVG 在 rerender 与 reopen 时复用 Data URL，SVG 变化时重新计算。
- 保留现有 XML-safe normalization 与 UTF-8 Base64 contract，不引入标签白名单。
- serialization exception 继续 fail-soft，但 MUST 产生不包含 SVG 原文的 diagnostic。

## 非目标

- 不修改 Mermaid render、DOMPurify strict sanitization、viewerjs toolbar 或 singleton lifecycle。
- 不引入 Web Worker、全局/unbounded cache、新依赖或 backend contract。
- 不处理与本变更无关的 `SettingsView.test.tsx` 既有失败。

## What Changes

- `MermaidFullscreenViewer` 在 viewer effect 内为 `<img>` 设置 cached Data URL，render path 不再同步 normalization。
- `svgToDataUrl` 对 serialization exception 输出 bounded、无 SVG payload 的 diagnostic，同时保持原始 SVG Base64 fallback。
- 增加 rerender、reopen、SVG replacement、exception fallback 回归测试。
- 更新 Mermaid fullscreen behavior spec，固化 render-path 与 observability contract。

## 方案对比与取舍

1. **推荐：existing effect + component-local single-entry cache**
   - 优点：重活移出 render；cache 生命周期与 viewer component 对齐；内存有界；无跨 surface 隐藏状态。
   - 代价：首次打开新 SVG 仍需一次同步 normalization，但只在 effect 中执行一次。
2. **`useMemo`**
   - 优点：diff 最小。
   - 缺点：首次计算仍发生在 render；`open` 切换可能使 reopen 重算，无法完整满足目标。
3. **module-level cache / Web Worker**
   - 优点：可跨 component 复用或隔离 CPU。
   - 缺点：前者引入隐藏全局状态，后者缺少 DOM/XMLSerializer 且复杂度过高；均不采用。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `markdown-mermaid-block-fullscreen-viewer`: 增加 XML-safe Data URL 的 effect-scoped computation、bounded reuse 与 exception diagnostic contract。

## Impact

- Code:
  - `src/features/markdown/mermaidFullscreen/MermaidFullscreenViewer.tsx`
  - `src/features/markdown/mermaidFullscreen/svgToDataUrl.ts`
- Tests:
  - `src/features/markdown/mermaidFullscreen/svgToDataUrl.test.ts`
  - Mermaid fullscreen viewer focused tests
- Specs:
  - `openspec/specs/markdown-mermaid-block-fullscreen-viewer/spec.md`
- Dependencies / APIs / persistence：无变化。

## 验收标准

- 同一 SVG 在 fullscreen open 后发生任意 parent rerender 时，`svgToDataUrl` 仅执行一次。
- 关闭后 reopen 同一 SVG 复用 cached Data URL；替换 SVG 后恰好重新计算一次。
- Viewer constructor 执行前，bound `<img>` 已拥有非空 Data URL。
- `XMLSerializer` 抛错时不向 caller 抛出，仍返回原始 SVG Base64，并产生不包含 SVG 内容的 diagnostic。
- Mermaid focused tests、lint、typecheck 与 OpenSpec strict validation 通过。

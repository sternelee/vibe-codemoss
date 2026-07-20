# Verification: harden-mermaid-fullscreen-normalization-runtime

## Summary

| Dimension | Result |
|---|---|
| Completeness | 7/7 tasks complete；1 modified requirement implemented and synced |
| Correctness | 31 focused fullscreen/serialization tests passed；all delta scenarios mapped |
| Consistency | existing viewer effect reused；component-local single-entry cache；no new dependency/global cache |

## Requirement Evidence

### Effect-scoped normalization and bounded reuse

- `src/features/markdown/mermaidFullscreen/MermaidFullscreenViewer.tsx`
  - render 只创建无 `src` 的 portal `<img>`。
  - existing `open/svg` effect 在 cancellation guard 后读取或生成 Data URL。
  - component-local ref 只保留最近 `{ svg, dataUrl }`。
  - `imageElement.src` 在 `new ViewerCtor(imageElement, options)` 前设置。

### Content-free fallback diagnostic

- `src/features/markdown/mermaidFullscreen/svgToDataUrl.ts`
  - serialization exception 继续回退原 SVG UTF-8 Base64。
  - warning 仅包含 stable diagnostic code、`errorName` 与 `svgLength`。
  - SVG source 与 error message 不进入 diagnostic。

### Scenario coverage

- render 后、effect settle 前 `svgToDataUrl` 调用数为 0。
- parent rerender 与 close/reopen SVG A 均不重算。
- replacement SVG B 恰好重算一次并覆盖旧 cache。
- Viewer constructor 捕获的 source 是已生成 Data URL。
- throwing `XMLSerializer` fallback 不抛异常且 warning 不含 private label。
- existing XHTML void elements、named entity、Unicode、viewer lifecycle、files/messages surface 与 theme tests 保持通过。

## Automated Gates

- Mermaid focused Vitest：PASS，6 files / 31 tests。
- `npm run lint`：PASS。
- `npm run typecheck`：PASS。
- `git diff --check`：PASS。
- `openspec validate harden-mermaid-fullscreen-normalization-runtime --type change --strict --no-interactive`：PASS。
- `openspec validate markdown-mermaid-block-fullscreen-viewer --type spec --strict --no-interactive`：PASS。
- Delta/main requirement exact comparison：PASS，3949 chars。

## Out-of-scope Baseline

`src/features/settings/components/SettingsView.test.tsx:1486` 的
`persists client UI visibility panel and control toggles` 在本变更前后均稳定失败，
原因是页面不存在 `Client UI visibility` 文案。Settings 文件不在本次 diff；
本 change 未修改、跳过或吞掉该失败。

## Findings

- CRITICAL：0
- WARNING：0
- SUGGESTION：0

结论：实现与 proposal / design / delta spec 一致，main spec 已同步，满足 archive gate。

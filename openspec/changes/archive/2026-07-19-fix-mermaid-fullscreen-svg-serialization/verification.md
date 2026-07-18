# Verification: fix-mermaid-fullscreen-svg-serialization

## Summary

| Dimension | Result |
|---|---|
| Completeness | 7/7 tasks complete；1 modified requirement fully implemented and synced to the main spec |
| Correctness | 6 focused serialization tests + 23 existing fullscreen tests passed |
| Consistency | Implementation follows inert HTML parse + XMLSerializer design；no security/config/viewerjs drift |

## Requirement Evidence

### XML-safe serialization

- `src/features/markdown/mermaidFullscreen/svgToDataUrl.ts`
  - feature-detects `document` / `XMLSerializer`
  - parses only in an inert `<template>`
  - requires an SVG namespace root
  - removes redundant descendant namespace declarations before XML serialization
  - preserves the original UTF-8 Base64 fallback

### Scenario coverage

- HTML void elements：`<br>` / `<hr>` / `<img>` / `<input>` / `<wbr>`
- HTML named entity：`&nbsp;`
- Unicode：中文 / 日本語 / Emoji
- existing valid SVG
- empty input
- missing SVG root
- missing `XMLSerializer`
- existing portal / `viewer.show()` / singleton / theme lifecycle

## Automated Gates

- `npx vitest run src/features/markdown/mermaidFullscreen/svgToDataUrl.test.ts ...`
  - PASS: 5 files, 29 tests
- `npm run lint`
  - PASS
- `npm run typecheck`
  - PASS
- `git diff --check`
  - PASS
- `openspec validate fix-mermaid-fullscreen-svg-serialization --type change --strict --no-interactive`
  - PASS

## Native WKWebView Smoke

使用截图对应的 589-character Mermaid source，通过仓库实际 `mermaid@11.12.2` 和当前 `svgToDataUrl`：

- raw SVG：26198 chars
- XML-safe SVG：25927 chars
- XML parser error：`null`
- `<img>` event：`load`
- natural size：`2089 × 354`

修复前同一 source 的原始 SVG Data URL 触发 `<img>` `error`，`naturalWidth = 0`。

## Findings

- CRITICAL：0
- WARNING：0
- SUGGESTION：0

结论：实现与 proposal / design / delta spec 一致，满足 sync/archive gate。

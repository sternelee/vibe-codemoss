## 1. XML-safe Serialization

- [x] 1.1 [P0, deps: none] 在 `svgToDataUrl.ts` 增加 inert HTML parse + `XMLSerializer` normalization；输入为 Mermaid strict-sanitized SVG，输出为 XML-safe UTF-8 Base64 Data URL；以 feature detection + 原始编码 fallback 保持空输入和非浏览器边界。验证：focused unit tests。
- [x] 1.2 [P0, deps: 1.1] 新增 `svgToDataUrl.test.ts`，覆盖 void elements、`&nbsp;`、Unicode、合法 SVG、空输入与缺少 `<svg>` root fallback；验证：`npx vitest run src/features/markdown/mermaidFullscreen/svgToDataUrl.test.ts`。

## 2. Regression And Quality Gates

- [x] 2.1 [P0, deps: 1.1, 1.2] 运行现有 messages/files Mermaid fullscreen tests，确认 portal、viewer.show、singleton 与 lifecycle 未回归。
- [x] 2.2 [P0, deps: 2.1] 运行 `npm run lint`、`npm run typecheck` 与 focused Vitest；记录全部结果。
- [x] 2.3 [P0, deps: 2.2] 使用截图对应 589-character Mermaid source 在 macOS WKWebView 验证 serialization 后 XML parser 无错误且 `<img>` load；运行 `openspec validate fix-mermaid-fullscreen-svg-serialization --type change --strict --no-interactive`。

## 3. Spec Closure

- [x] 3.1 [P1, deps: 2.3] 执行 implementation-to-artifact verify，确认 requirements/scenarios/design/tasks 与代码证据一致且无 CRITICAL/WARNING。
- [x] 3.2 [P1, deps: 3.1] 将 delta spec 幂等同步到 `openspec/specs/markdown-mermaid-block-fullscreen-viewer/spec.md` 并归档 change。

## 1. Viewer Runtime Hardening

- [x] 1.1 [P0, depends: none] 修改 `MermaidFullscreenViewer.tsx`：输入为 `open/svg`，输出为 effect-scoped `<img src>` injection 与 component-local single-entry cache；验证 Viewer constructor 前 source 非空。
- [x] 1.2 [P1, depends: 1.1] 验证 rerender、close/reopen 同一 SVG 不重复调用 `svgToDataUrl`，SVG replacement 恰好重算一次。

## 2. Diagnostic Hardening

- [x] 2.1 [P0, depends: none] 修改 `svgToDataUrl.ts` exception path：输入为 serialization exception，输出为 content-free warning + 原 SVG Base64 fallback；验证 caller 不收到异常且 diagnostic 不包含 SVG source。
- [x] 2.2 [P1, depends: 2.1] 增加 throwing `XMLSerializer` 回归测试，验证 warning metadata 与 fallback decode。

## 3. Verification And Closure

- [x] 3.1 [P0, depends: 1.2, 2.2] 运行 Mermaid focused Vitest、`npm run lint`、`npm run typecheck`、`git diff --check`。
- [x] 3.2 [P0, depends: 3.1] 执行 OpenSpec strict verify，记录 closure evidence，同步 main spec 并归档 change。
- [x] 3.3 [P1, depends: 3.2] 归档关联 Trellis task；若全量测试仍命中既有 `SettingsView.test.tsx` 失败，显式记录为 out-of-scope baseline。

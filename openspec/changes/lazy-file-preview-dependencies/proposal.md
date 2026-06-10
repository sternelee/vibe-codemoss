# lazy-file-preview-dependencies

## Summary / 摘要

把 CodeMirror language extensions、find-in-file search module、PDF.js / docs preview runtime 从 file panel startup/static path 中拆出，只在对应 file type、edit mode 或 preview mode 激活时加载。

## Problem / 问题

`P0-10` 指出 `FileViewPanel.tsx` 静态导入 CodeMirror types/search/keymap 与 language resolver；`codemirrorLanguageExtensions.ts` 静态导入所有 language packages；`FilePdfPreview.tsx` 静态导入 `pdfjs-dist`。当前 `vendor-codemirror` gzip 约 `302 KB`，`vendor-docs` gzip 约 `394 KB`，`pdf.worker` gzip 约 `369 KB`。

这会让打开 app 或非文件 feature 时过早支付编辑器/PDF/doc 预览成本，也让 image/plain/markdown preview 误带全部语言扩展。

## Goals / 目标

- File panel 拆为 shell + editor renderer + preview renderer lazy boundaries。
- CodeMirror 只在 edit mode 或 text editor surface 需要时加载。
- Language extension resolver 改为 async per-language dynamic imports。
- `@codemirror/search` 只在 find-in-file 打开时加载。
- `pdfjs-dist` 只在 PDF preview path 内加载。
- Image/plain/markdown preview 保持 lightweight，不加载全量 language extensions。

## Non-Goals / 非目标

- 不重写 file editor typing latency；该问题已由 `harden-file-editor-typing-latency` 覆盖。
- 不删除现有 PDF/doc/table preview 能力。
- 不降低 dirty-buffer、external sync、save semantics。
- 不把所有 file preview 迁移到 worker；本 change 聚焦 dependency load timing。

## Approach / 方案

1. Audit file panel import graph and current Vite chunks。
2. 拆分 `FileViewPanel` shell 与 editor/preview runtime。
3. 将 CodeMirror editor runtime 移到 edit/text activation path。
4. 将 language extension resolver 改为 async loader with cache。
5. 将 find-in-file search extension 改为 first-open lazy load。
6. 将 PDF.js runtime 和 worker init 限定在 PDF preview。
7. 增加 file type switching / initialization race tests。

## Risks / 风险

- Async language loading 可能导致 editor 首次打开短暂 fallback，需要 stable loading state。
- 文件切换时 lazy import race 可能把旧语言/PDF runtime 应用到新文件。
- PDF worker 初始化失败必须显式 fallback，不能留下空白面板。

## Acceptance Criteria / 验收口径

- Opening app or non-file features does not load CodeMirror/PDF chunks。
- Opening image/plain text preview does not load all language extensions。
- Find-in-file still works after lazy `@codemirror/search` load。
- Switching file types during lazy load does not apply stale renderer state。
- Bundle evidence shows CodeMirror/PDF/docs dependencies remain lazy from startup path。

## Validation / 验证

- Focused file preview/editor lazy load tests。
- File type switching and stale import race tests。
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run check:bundle-chunking`
- `openspec validate lazy-file-preview-dependencies --strict --no-interactive`

# Tasks / 任务

## Planning / 规划

- [x] Inventory file panel, editor, language resolver, PDF preview, and docs preview import graph.
- [x] Classify dependencies by activation trigger.
- [x] Define stale loader guard contract for file/mode switching.

## Implementation / 实施

- [ ] Split file panel shell from editor and preview runtime modules.
- [ ] Lazy-load CodeMirror only for edit/text editor activation.
- [x] Convert language extension resolver to async per-language dynamic imports with cache.
- [ ] Lazy-load `@codemirror/search` on find-in-file activation.
- [x] Lazy-load PDF.js only inside PDF preview path.
- [x] Add stable loading/fallback states and stale request guards.

## Validation / 验证

- [ ] Add file type switching and lazy initialization race tests.
- [ ] Add find-in-file lazy search regression test.
- [x] Add PDF preview lazy runtime/fallback test where feasible.
- [x] Run `npm run typecheck`.
- [x] Run `npm run lint`.
- [x] Run `npm run build`.
- [x] Run `npm run check:bundle-chunking` and record CodeMirror/PDF startup evidence.
- [x] Run `openspec validate lazy-file-preview-dependencies --strict --no-interactive`.

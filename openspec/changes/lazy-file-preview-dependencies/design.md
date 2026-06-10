# Design / 设计

## Load Boundaries / 加载边界

| Dependency | Load Trigger |
|---|---|
| CodeMirror editor runtime | edit mode or text editor surface activation |
| CodeMirror language package | matching language first use |
| `@codemirror/search` | find-in-file first open |
| PDF.js runtime/worker | PDF preview activation |
| Office/spreadsheet preview runtime | matching preview activation |
| Image/plain preview | no CodeMirror/PDF dependency required |

## Race Guard / 竞态保护

Every async preview/editor loader must bind to file identity, view mode, and request token. If the active file or mode changes before loader resolves, the stale result must be ignored.

## Fallback / 降级

Editor/preview surfaces should show stable loading or fallback states while lazy dependencies load. PDF worker failure and language loader failure must not crash the file panel.

## Evidence / 证据

Evidence should include Vite build chunks and startup import graph notes proving CodeMirror/PDF/docs dependencies are not pulled by app startup or non-file feature activation.

## Rollback / 回滚

Each dependency group should be reversible independently: CodeMirror runtime, per-language loaders, find-in-file search, PDF runtime.

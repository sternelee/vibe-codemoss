## Why

Issue `desktop-cc-gui#618` reports that on macOS, typing `@` in the composer and referencing a file can make the app surface turn blank. The file-reference completion path is a high-frequency input path, so malformed workspace entries, duplicate completion items, or DOM rewrite failures must degrade locally instead of escaping into an app-level white screen.

## 目标与边界

- 目标：`ChatInputBox` 的 `@` file reference completion MUST remain recoverable when provider data, lazy workspace children, or rich-tag rendering contains unexpected values.
- 目标：completion provider MUST normalize and deduplicate file/directory items before rendering the dropdown.
- 目标：file tag rendering failures MUST be logged and isolated to composer state, without tearing down the app shell.
- 边界：只处理 composer inline file reference completion/rendering 的稳定性，不重做 workspace scan、file open、message send 或 context ledger semantics。

## What Changes

- Harden composer file-reference completion inputs by filtering invalid paths, trimming blank entries, and deduplicating stable completion item keys.
- Harden lazy workspace directory-child mapping so malformed Tauri payloads do not crash dropdown rendering.
- Add local guardrails around file-tag DOM rendering so an inline reference render failure does not propagate as a white-screen failure.
- Add focused regression tests covering invalid/duplicate completion source entries and recoverable `@` file reference behavior.

## 非目标

- 不改变 `@path` token format 或 existing file-reference extraction behavior.
- 不改变 backend workspace directory listing contract beyond frontend defensive consumption.
- 不引入新的 completion UI framework 或第三方依赖。
- 不修复与本问题无关的 active file reference、drag-drop reference 或 context attribution 行为。

## 技术方案对比

| 方案 | 做法 | 优点 | 缺点 | 结论 |
| --- | --- | --- | --- | --- |
| A | 只在 `ErrorBoundary` 捕获白屏 | 改动小 | 用户仍会丢失 composer interaction；根因仍可重复触发 | 不采用 |
| B | 在 completion provider 与 tag renderer 边界做 defensive normalization / isolation | 局部修复，高频路径可恢复，契约清晰 | 需要补 focused tests | 采用 |
| C | 重写 `ChatInputBox` 为 textarea 或全新 mention engine | 可彻底规避 contenteditable 风险 | 过度设计，回归面大，不符合当前 issue 范围 | 不采用 |

## Capabilities

### New Capabilities

- `composer-file-reference-completion-stability`: Defines recoverability and data-normalization requirements for composer `@` file-reference completion and inline tag rendering.

### Modified Capabilities

- None.

## Impact

- Frontend composer code:
  - `src/features/composer/components/ChatInputBox/ChatInputBoxAdapter.tsx`
  - `src/features/composer/components/ChatInputBox/hooks/useFileTags.ts`
  - related focused tests under `src/features/composer/components/ChatInputBox/`
- No backend API, storage schema, or dependency changes.

## 验收标准

- Given malformed, blank, or duplicate file/directory paths are supplied to composer file completion, when the user types `@`, then dropdown item generation MUST not throw and MUST show only valid unique entries.
- Given lazy workspace children return unexpected entries, when file completion searches a nested directory, then invalid children MUST be skipped without crashing the app.
- Given file tag rendering encounters a DOM/runtime exception, when the user continues typing, then the exception MUST be logged and composer/app shell MUST remain interactive.
- Focused Vitest coverage MUST pass for the touched composer file-reference path.

## Implementation Closure

- Implemented frontend normalization and deduplication in `ChatInputBoxAdapter`.
- Implemented local render-failure isolation in `useFileTags`.
- Validation passed:
  - `npx vitest run src/features/composer/components/ChatInputBox/hooks/useTriggerDetection.test.tsx src/features/composer/components/ChatInputBox/hooks/useFileTags.test.tsx src/features/composer/components/ChatInputBox/ChatInputBoxAdapter.test.tsx`
  - `npm run typecheck`
  - `openspec validate fix-composer-file-reference-at-white-screen --strict --no-interactive`

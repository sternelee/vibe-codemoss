## 1. OpenSpec Contract

- [x] 1.1 Add proposal/design/spec artifacts for `composer-file-reference-completion-stability`; input: issue `#618` report and current composer file-reference code; output: validated OpenSpec behavior contract; validation: `openspec validate fix-composer-file-reference-at-white-screen --strict --no-interactive`; dependencies: none; priority: P0.

## 2. Composer Completion Hardening

- [x] 2.1 Normalize top-level file and directory source paths in `ChatInputBoxAdapter`; input: `directories` / `files` props; output: blank, malformed, and duplicate paths skipped before completion item creation; validation: focused adapter test; dependencies: 1.1; priority: P0.
- [x] 2.2 Normalize lazy workspace directory-child payloads; input: `getWorkspaceDirectoryChildren(...)` result; output: malformed children skipped while valid children remain searchable; validation: focused adapter test; dependencies: 2.1; priority: P0.
- [x] 2.3 Deduplicate completion item rendering keys before dropdown handoff; input: mixed direct/lazy completion items; output: stable unique item list; validation: focused adapter test asserts duplicates are collapsed; dependencies: 2.1; priority: P0.

## 3. Inline Tag Rendering Resilience

- [x] 3.1 Guard file-tag DOM rewrite and cursor restoration in `useFileTags`; input: current `renderFileTags` flow; output: render exceptions are logged and transient state is reset without app teardown; validation: focused hook test or deterministic guard test; dependencies: 1.1; priority: P0.
- [x] 3.2 Preserve raw editable text when file-tag rendering degrades; input: render failure path; output: composer remains editable for subsequent input; validation: focused hook test; dependencies: 3.1; priority: P0.

## 4. Verification

- [x] 4.1 Run focused Vitest suites for `ChatInputBoxAdapter`, `useFileTags`, and related trigger detection; input: implemented frontend changes; output: passing regression evidence; validation: `npx vitest run src/features/composer/components/ChatInputBox/hooks/useTriggerDetection.test.tsx src/features/composer/components/ChatInputBox/hooks/useFileTags.test.tsx src/features/composer/components/ChatInputBox/ChatInputBoxAdapter.test.tsx`; dependencies: 2.1, 2.2, 2.3, 3.1; priority: P0.
- [x] 4.2 Run strict OpenSpec validation for the change; input: completed artifacts; output: change validates strictly; validation: `openspec validate fix-composer-file-reference-at-white-screen --strict --no-interactive`; dependencies: 4.1; priority: P0.

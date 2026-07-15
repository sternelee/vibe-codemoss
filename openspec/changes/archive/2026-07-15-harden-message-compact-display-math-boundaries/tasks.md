## 1. Compact boundary implementation

- [x] 1.1 [P0, depends: none] Add a message-only bounded compact display scanner in `markdownMath.ts`; input is render-time text, output is canonical delimiter lines only for trusted pairs, verified by pure assertions.
- [x] 1.2 [P0, depends: 1.1] Compose the scanner before bare standalone formula promotion without changing public APIs, file-preview `lineMap`, or lightweight streaming behavior.

## 2. Regression coverage

- [x] 2.1 [P0, depends: 1.2] Add MiniMax-style compact `aligned` DOM coverage; output must have one valid display, no `.katex-error`, and trailing prose outside math.
- [x] 2.2 [P0, depends: 1.2] Add canonical GPT, idempotence, unmatched/nested/code-fence and single-line display fixtures; ambiguous inputs must remain unchanged.
- [x] 2.3 [P1, depends: 2.1] Lock lightweight/full boundary: lightweight does not invoke full math normalization, settled full rendering produces KaTeX.

## 3. Verification

- [x] 3.1 [P0, depends: 2.1, 2.2, 2.3] Run PR #834 message/file focused suites plus compact regression tests and record exact results.
- [x] 3.2 [P0, depends: 3.1] Run `npm run typecheck`, `npm run lint`, `npm run check:large-files`, and strict OpenSpec validation.
- [x] 3.3 [P1, depends: 3.2] Review the final diff for persisted-source, file-preview and streaming-hot-path isolation; write `verification.md` with rollback evidence.

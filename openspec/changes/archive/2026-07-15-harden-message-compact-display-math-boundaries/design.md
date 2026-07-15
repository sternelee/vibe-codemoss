## Context

Rich message rendering currently applies generic text cleanup and then `normalizeMarkdownMathForMessage()`. `normalizeStandaloneMathDisplayLines()` only toggles display state when a trimmed line equals `$$`; a compact opener such as `$$\begin{aligned}` is therefore treated as ordinary text, while each following bare LaTeX line is promoted independently. A compact closer followed by prose is split again by the CJK heuristic, leaving an orphan `\end{aligned}` and corrupting the remaining Markdown.

PR #834 adds conservative `\[...\]` container handling and established dollar-range protection. This follow-up must compose with that behavior without broadening its scope or changing file-preview `lineMap`.

## Goals / Non-Goals

**Goals:**

- Canonicalize trusted compact multi-line dollar display blocks before bare-line promotion.
- Preserve formula body, Markdown container context and trailing prose semantics.
- Fail unchanged for ambiguous, unmatched, nested or code-fenced candidates.
- Keep normalization idempotent and bounded linear-time.
- Lock GPT canonical output, MiniMax compact output and PR #834 fixtures in the same regression matrix.

**Non-Goals:**

- Rendering KaTeX inside `LightweightMarkdown` on every streaming delta.
- Mutating persisted message/file source or file-preview line mapping.
- Supporting arbitrary malformed TeX by speculative delimiter insertion.

## Decisions

### Decision 1: message-only compact block canonicalization

Add a pure helper used by `normalizeMarkdownMathForMessage()` before existing standalone promotion. File preview keeps the PR #834 shared path unchanged because the reported failure is message-model compatibility and inserting canonical delimiter lines would otherwise require a new `lineMap` contract.

Alternative considered: add the helper to `normalizeCommonMathDelimiters()`. Rejected because that shared function serves file preview and would silently change source-line mapping.

### Decision 2: line-aware paired scan, not cross-line replacement

Scan lines while preserving Markdown prefix. A candidate opener must start a line's content with unescaped `$$`, contain non-empty LaTeX-like body text after it, and not close on the same line. The matching closer must occur on a later compatible line; only then are opener/body and body/closer/prose separated into canonical lines.

Alternative considered: one `/\$\$([\s\S]*?)\$\$/g` replacement. Rejected because it can cross code/container boundaries and cannot safely classify single-line display, currency-like prose or unmatched blocks.

### Decision 3: protect malformed input by non-mutation

The scanner buffers a candidate until a trustworthy closer is found. Nested opener, incompatible prefix or end-of-input flushes the original lines unchanged. The helper never repairs TeX environments; it only canonicalizes delimiter placement.

### Decision 4: streaming performance remains unchanged

`liveRenderMode="lightweight"` continues to bypass full normalization. Tests verify that lightweight remains source-oriented while full/settled rendering produces KaTeX. This change fixes final fidelity without restoring heavy per-delta work.

## Risks / Trade-offs

- [Risk] A prose line beginning with `$$` is mistaken for display math. → Require multiline pairing, LaTeX-like body and compatible line/container boundaries; ambiguous input remains unchanged.
- [Risk] Added lines change annotation mapping. → Limit helper to message normalization; file preview remains on the existing line-preserving path.
- [Risk] Repeated normalization splits the same block again. → Canonical opener/closer lines are recognized by existing state tracking and a double-normalization fixture locks idempotence.
- [Risk] A malformed block swallows following prose. → Buffer until a valid closer; unmatched or nested candidates are emitted exactly as received.

## Migration Plan

No persisted-data migration is required. Deploy as a render-time compatibility change. Roll back the follow-up fix commit independently from PR #834 if focused or manual regression appears.

## Open Questions

None. Live KaTeX during token streaming remains a separate performance/product decision.

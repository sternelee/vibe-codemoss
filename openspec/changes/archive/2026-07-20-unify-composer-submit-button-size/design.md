## Context

`ButtonArea` already renders the same `.submit-button` for Home and Conversation. Home-specific geometry overrides have been removed, so shared `buttons.css` is now the single owner. Product review confirmed the unified `30px` action should be reduced to `26px`.

## Goals / Non-Goals

**Goals:**

- Keep send and stop action geometry at `26px × 26px` on both surfaces and across responsive breakpoints.
- Scale ArrowUp to `14px`, stop icon to `10px`, and radius to `8px`.
- Lock the Home override with a focused CSS contract test.

**Non-Goals:**

- No React component, event flow, state, color, icon glyph/asset, toolbar spacing, or dependency changes.

## Decisions

- Keep Home free of geometry overrides and adjust only the shared `.submit-button` / `.stop-button` contract.
- Use `26px` as the canonical size, with proportionally smaller icons and radius, matching the confirmed compact appearance.
- Extend the existing `HomeChat.styles.test.ts` string contract rather than adding visual-test infrastructure.

Alternative: introduce `size="compact"` on `ButtonArea`. Rejected because both surfaces require the same size and a variant would preserve the unnecessary split.

## Risks / Trade-offs

- [Risk] A later responsive rule could reintroduce a larger size → focused assertion rejects Home geometry overrides.
- [Trade-off] CSS source assertions do not measure browser layout → acceptable for a numeric cascade regression with no runtime behavior change.

## Migration Plan

No migration is required. Rollback consists of reverting the Home CSS value and its focused assertion.

## Open Questions

无。

## Verification

Generated on 2026-05-25 for `unify-context-ledger-toggle-position`.

### Commands

| Command | Result | Notes |
|---|---|---|
| `openspec validate unify-context-ledger-toggle-position --strict --no-interactive` | Pass | Change artifact validation passed. |
| `npx vitest run src/features/composer/components/ChatInputBox/ComposerReadinessBar.test.tsx src/features/context-ledger/components/ContextLedgerPanel.test.tsx src/features/composer/components/Composer.context-ledger-governance.test.tsx src/features/composer/components/Composer.context-ledger-transition.test.tsx` | Pass | Focused UI coverage for the right-top expand/collapse toggle and duplicate-header suppression passed. |
| `npx eslint src/features/composer/components/Composer.tsx src/features/composer/components/ChatInputBox/ChatInputBox.tsx src/features/composer/components/ChatInputBox/ChatInputBoxAdapter.tsx src/features/composer/components/ChatInputBox/ChatInputBoxHeader.tsx src/features/composer/components/ChatInputBox/ComposerReadinessBar.tsx src/features/context-ledger/components/ContextLedgerPanel.tsx` | Pass | Touched TypeScript / TSX files linted cleanly. |
| `npm run check:large-files` | Pass | Large-file sentry found 0 blocking findings. |
| `git diff --check` | Pass | No whitespace errors in the scoped diff. |
| `npm run typecheck` | Pass | Full TypeScript validation passed. |

### Manual QA

- User confirmed the adjusted Composer interaction passes testing on 2026-05-25.

### Evidence Summary

- `ComposerReadinessBar` owns the single Context Ledger disclosure action in the Composer dialog top-right readiness area.
- The same button switches between `展开` and `收起`.
- `ContextLedgerPanel` renders expanded detail with `hideHeader` when Composer delegates disclosure ownership to the readiness bar.
- Collapsed state no longer creates a separate ledger header under the readiness bar.
- Prompt assembly, send payload, memory injection, and runtime lifecycle were not changed.

### Residual Risk

- No known residual risk for this scoped UI placement change.

# Verification

## Commands

- `npx vitest run src/app-shell-parts/selectedComposerSession.test.ts src/app-shell-parts/useSelectedComposerSession.test.tsx src/app-shell-parts/modelSelection.test.ts src/features/engine/engineCapabilityMatrix.test.ts src/features/engine/capabilities/useCapability.test.tsx src/features/threads/hooks/useThreadMessaging.context-injection.test.tsx`
  - Result: passed, 6 test files / 60 tests.
- `npm run check:engine-capability-matrix`
  - Result: passed, `[engine-capability-matrix] ok`.
- `cargo test --manifest-path src-tauri/Cargo.toml capability_matrix`
  - Result: passed, 4 matching Rust tests.
- `npm run typecheck`
  - Result: passed.
- `openspec validate --all --strict --no-interactive`
  - Result: passed, 320 items.

## Notes

- `npm run test -- <focused files>` was attempted first, but the project batched test wrapper rejected path arguments. Focused frontend verification used `npx vitest run ...` instead.

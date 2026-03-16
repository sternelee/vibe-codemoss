# Large File Governance Playbook

## Scope

This playbook governs large-file growth with Deferred + JIT strategy.

- Enforcement threshold: `> 3000` lines
- Watchlist threshold: `2500-3000` lines (informational only)
- Scanner: `scripts/check-large-files.mjs`
- Baseline report: `docs/architecture/large-file-baseline.md`
- Optional watchlist report: `docs/architecture/large-file-near-threshold-watchlist.md`

## Quality Gate

### Local checks

```bash
npm run check:large-files:baseline
npm run check:large-files:gate
npm run check:large-files:near-threshold:baseline  # optional visibility report
```

### CI checks

- Workflow: `.github/workflows/large-file-governance.yml`
- Hard gate command: `npm run check:large-files:gate`
- Rule: any new `>3000` file fails PR checks.
- Near-threshold (`2500-3000`) does not block merge by itself.

## JIT Remediation Protocol

When a PR fails large-file gate because a file exceeds 3000 lines:

1. Keep remediation in the same PR. Do not merge first and split later.
2. Apply minimal-scope decomposition (extract modules/adapters only as needed to get under threshold).
3. Preserve facade exports and external contracts.
4. Re-run required checks:

```bash
npm run typecheck
npm run check:large-files:gate
cargo check --manifest-path src-tauri/Cargo.toml
```

5. Include retained capability notes in PR description.

## Capability Retention Matrix

| Area | Before | After | Retention Proof |
|---|---|---|---|
| Git history panel | Monolithic panel implementation | Split into modular panel/hooks/utils files | `src/features/git-history/components/GitHistoryPanel.tsx` + `git-history-panel/**` |
| App shell bootstrap | `App.tsx` monolith | `App.tsx` entry + `router/bootstrap/app-shell` split | `src/App.tsx`, `src/router.tsx`, `src/bootstrap.ts`, `src/app-shell.tsx` |
| Settings feature | `SettingsView.tsx` monolith | Sections/hooks/actions split | `src/features/settings/components/settings-view/**` |
| Rust backend bridge | `app_server.rs`, `engine/commands.rs`, `git/mod.rs` monoliths | command/service/helper modules extracted | `src-tauri/src/backend/*`, `src-tauri/src/engine/*`, `src-tauri/src/git/*` |
| CSS and i18n | Large single files | Split by parts with stable aggregator imports | `src/styles/*.part*.css`, `src/i18n/locales/*.part*.ts` |

## Rollback Manual

### Trigger

Rollback is required when any of the following occurs after JIT modularization:

- App startup/navigation regression.
- SpecHub / GitHistory / Settings critical interaction breakage.
- Rust bridge command dispatch regression.
- CI hard gate false-positive due scanner bug.

### Fast rollback (single PR)

1. Revert modularization commit(s) for impacted area only.
2. Keep unrelated areas untouched.
3. Re-run:

```bash
npm run check:large-files:gate
cargo check --manifest-path src-tauri/Cargo.toml
```

4. Open a follow-up hotfix issue with root cause and corrected split plan.

### Surgical rollback (partial)

1. Restore previous entry file as adapter layer, keep new modules in place.
2. Re-export legacy API from adapter to preserve call sites.
3. Add temporary feature flag or fallback path for unstable new branch.
4. Re-run target module tests and smoke checks.

## Merge Guardrails

- Do not use whole-file `--ours/--theirs` on high-risk files.
- Resolve conflicts semantically at state/action/render granularity.
- Verify key symbols still exist with `rg`.
- Keep PR notes with explicit “retained capability list”.
- For `>3000` violations, remediation must be in the same PR.

## Operational Notes

- Deferred + JIT is the default mode: no mandatory batch split for near-threshold files.
- Keep an optional watchlist report to track risk hotspots over time.
- Prefer incremental split by `state/actions/render`.
- Keep external API and exported types stable during split.

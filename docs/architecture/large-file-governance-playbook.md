# Large File Governance Playbook

## Scope

This playbook governs large-file growth with a domain-aware, baseline-aware policy engine.

## Governance Artifacts

- Scanner: `scripts/check-large-files.mjs`
- Policy config: `scripts/check-large-files.policy.json`
- Hard-debt baseline:
  - Machine-readable: `docs/architecture/large-file-baseline.json`
  - Human-readable: `docs/architecture/large-file-baseline.md`
- New-file ratchet baseline:
  - Machine-readable: `docs/architecture/large-file-new-file-baseline.json`
  - Human-readable: `docs/architecture/large-file-new-file-baseline.md`
- Near-threshold watchlist:
  - Human-readable: `docs/architecture/large-file-near-threshold-watchlist.md`

## Policy Groups

All policy groups share an additional new-file fail threshold of `800` lines. Files already captured in
`docs/architecture/large-file-new-file-baseline.json` keep the legacy policy fail threshold below.

| Policy | Scope | Warn | Legacy Fail | New-File Fail | Priority |
|---|---|---:|---:|---:|---|
| `bridge-runtime-critical` | `src/services/tauri.ts`, `src/app-shell.tsx`, `src-tauri/src/{backend,engine,git,runtime,codex}/**` | 2200 | 2600 | 800 | P0 |
| `feature-hotpath` | `threads/messages/composer/git-history/settings/spec/workspaces/shared-session` + `src/utils/threadItems.ts` | 2400 | 2800 | 800 | P1 |
| `styles` | `src/styles/**` | 2200 | 2800 | 800 | P1 |
| `test-files` | `src/test/**`, `*.test.*` | 2600 | 3000 | 800 | P2 |
| `i18n` | `src/i18n/locales/**` | 2600 | 3000 | 800 | P2 |
| `default-source` | other source files | 2600 | 3000 | 800 | P1 |

## Semantics

### Watchlist

- `npm run check:large-files:near-threshold` scans with policy `warn` thresholds.
- Output is informational only.
- Files above `warn` but not above `fail` appear as `severity=warn, status=watch`.
- Files already above `fail` still appear in the watchlist, with hard-debt status attached when baseline is available.

### Hard Debt

- `npm run check:large-files` reports only files above the matched policy `fail` threshold.
- `docs/architecture/large-file-baseline.json` is the debt ledger used to distinguish retained debt from regressions.
- Status semantics:
  - `new`: file is above fail threshold but has no baseline entry
  - `regressed`: file is above fail threshold and larger than baseline
  - `retained`: file is above fail threshold and equal to baseline
  - `reduced`: file is above fail threshold but smaller than baseline
  - `captured`: baseline generation run without loading a prior baseline

### New-File Ratchet

- `npm run check:large-files:new-file-baseline` captures the current set of governed files above `800` lines.
- `npm run check:large-files:gate` loads that ratchet baseline with `--new-file-baseline-file`.
- Files above `800` lines that are absent from the ratchet baseline are reported as `severity=fail, status=new, threshold=new-file-ratchet`.
- Files already present in the ratchet baseline are not blocked by the 800-line ratchet unless they also cross the matched legacy fail threshold.
- Do not regenerate the ratchet baseline to accept new 800+ files unless the governance decision is intentional and documented.

### Hard Gate

- `npm run check:large-files:gate` fails for:
  - policy hard-debt status `new` or `regressed`
  - new-file ratchet status `new`
- Retained or reduced debt remains visible but non-blocking.
- Remediation must happen in the same PR: split the file or reduce it back to/below baseline.

## Local Checks

```bash
npm run check:large-files:baseline
npm run check:large-files:new-file-baseline
npm run check:large-files:near-threshold:baseline
npm run check:large-files
npm run check:large-files:near-threshold
npm run check:large-files:gate
```

## CI Checks

- Workflow: `.github/workflows/large-file-governance.yml`
- Watch step: `npm run check:large-files:near-threshold`
- Hard gate step: `npm run check:large-files:gate`
- Rule: CI blocks only when a PR introduces `new` or `regressed` hard debt.

## Baseline Maintenance

- Update `docs/architecture/large-file-baseline.json` only when one of the following is true:
  - policy thresholds changed intentionally
  - a large-file refactor permanently reduced or reorganized current debt
- Update `docs/architecture/large-file-new-file-baseline.json` only when one of the following is true:
  - a ratchet threshold change is intentionally accepted
  - a pre-existing file is renamed or moved without changing ownership
  - a new 800+ file has an explicit governance exception recorded in the change
- Do not regenerate baseline casually to hide regressions.
- When baseline changes, regenerate the markdown report in the same PR and explain why in the PR description.

## JIT Remediation Protocol

When a PR fails large-file gate:

1. Keep remediation in the same PR.
2. Prefer minimal-scope decomposition:
   - extract domain hooks/helpers/adapters
   - preserve facade exports and external contracts
3. Re-run:

```bash
npm run typecheck
npm run check:large-files:gate
cargo check --manifest-path src-tauri/Cargo.toml
```

4. Record retained capability notes in the PR description.

## Current Follow-Up Queue

The first follow-up refactor targets remain:

- `src/services/tauri.ts`
- `src/app-shell.tsx`
- `src/features/threads/hooks/useThreadMessaging.ts`

## Rollback Manual

Rollback is required when any of the following occurs:

- scanner misclassifies files because of policy matching bugs
- baseline diff logic causes false-positive or false-negative gate results
- CI and local commands diverge in semantics

Rollback steps:

1. Revert the scanner, policy config, workflow, and generated baseline files together.
2. Keep unrelated product code untouched.
3. Re-run:

```bash
npm run check:large-files
npm run check:large-files:gate
```

4. Open a follow-up fix with the corrected policy or baseline strategy.

## Merge Guardrails

- Do not use whole-file `--ours/--theirs` on high-risk large files.
- Resolve conflicts semantically and verify retained capability points.
- Baseline updates must be reviewed as governance changes, not as generated noise.

## 1. Large-file wave3

- [ ] Split `src/services/tauri.ts` session wrappers into `src/services/tauri/session.ts`.
- [ ] Split permission wrappers into `src/services/tauri/permission.ts`.
- [ ] Split app-server wrappers into `src/services/tauri/appServer.ts`.
- [ ] Preserve `src/services/tauri.ts` public facade and existing import compatibility.
- [ ] Extract `useFileTreeViewState.ts` from `FileTreePanel.tsx`.
- [ ] Extract `FileTreeRefreshControls.tsx` from `FileTreePanel.tsx`.
- [ ] Run `npm run check:large-files`; no new module may enter near-threshold advisory debt.

## 2. Recovery cookbook

- [ ] Update `.trellis/spec/backend/codex-provider-scoped-runtime.md` with recovery failure playbook.
- [ ] Document `staleRecoveryClassification.reasonCode` / `staleReason` / `userAction`.
- [ ] Add GEMINI / CLAUDE provider recovery template.
- [ ] Link the cookbook back to `codex-stale-thread-binding-recovery` and `codex-message-recovery-hook`.

## 3. Measured evidence producers

- [ ] Add runtime producers for at least 10 remaining proxy metrics, or explicitly document why each cannot be measured yet.
- [ ] Keep unsupported/proxy rows honest when no real source artifact exists.
- [ ] Update `scripts/perf-v0511-runtime-evidence.test.mjs` for every producer.
- [ ] Regenerate `docs/perf/v0511-runtime-evidence.json` and aggregate perf reports.

## 4. Validation

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run check:large-files`
- [ ] `node --test scripts/perf-v0511-runtime-evidence.test.mjs scripts/perf-archive-readiness.test.mjs`
- [ ] `npm run perf:baseline:all`
- [ ] `npm run perf:archive-readiness -- --json`
- [ ] `openspec validate follow-up-v0511-large-file-cookbook-and-measured-evidence --strict --no-interactive`

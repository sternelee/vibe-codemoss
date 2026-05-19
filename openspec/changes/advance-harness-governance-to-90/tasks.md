## 0. Documentation-Only Planning Pass

- [x] 0.1 [P0][depends:none][write: none][verify: code/proposal mismatch list recorded] Recheck current harness governance proposals against code facts.
- [x] 0.2 [P0][depends:0.1][write: `openspec/changes/advance-harness-governance-to-90/**`][verify: proposal/design/spec/tasks present] Create the readiness proposal, design, delta spec, and task plan.
- [x] 0.3 [P0][depends:0.2][write: none][verify: `openspec validate advance-harness-governance-to-90 --strict --no-interactive`] Validate this planning change.
- [x] 0.4 [P0][depends:0.3][write: `openspec/changes/advance-harness-governance-to-90/design.md`, `tasks.md`][verify: tasks name files, commands, done criteria, and slice order] Review and optimize docs into executable state.
- [x] 0.5 [P0][depends:0.4][write: `openspec/changes/advance-harness-governance-to-90/proposal.md`, `design.md`, `tasks.md`, `specs/harness-governance-90-readiness/spec.md`][verify: 90% floor, 95% release-grade target, and 99% evidence-complete target are explicit] Upgrade readiness target from 90% floor to 95%-99% governance-layer readiness.

## 1. S1 Snapshot Injection Closure

- [ ] 1.1 [P0][depends:0][write: none][read: `src/features/status-panel/components/StatusPanel.tsx`, `src/features/governance/evidence/index.ts`, `src/features/status-panel/utils/checkpoint.ts`][verify: exact call site and dependency list documented in implementation notes] Inventory the live checkpoint construction seam.
- [ ] 1.2 [P0][depends:1.1][write: `src/features/status-panel/components/StatusPanel.tsx`][verify: `useGovernanceEvidence` and snapshot memo are positioned before checkpoint construction; `buildCheckpointViewModel` receives `governanceSnapshot` from `createFrozenGovernanceEvidenceSnapshot`; no conditional hook calls are introduced] Wire collected governance evidence into checkpoint policy input.
- [ ] 1.3 [P0][depends:1.2][write: `src/features/status-panel/components/StatusPanel.test.tsx`][verify: dock checkpoint renders a bridge-fed policy audit row from governance evidence; compact popover still hides audit] Add live UI/path regression coverage.
- [ ] 1.4 [P0][depends:1.2][write: `scripts/check-governance-evidence-bridge.mjs`][verify: checker fails if `StatusPanel` displays `GovernanceEvidenceSection` but does not pass `governanceSnapshot` into `buildCheckpointViewModel`] Harden bridge conformance.
- [ ] 1.5 [P0][depends:1.2-1.4][write: none][verify: `npm exec vitest run src/features/status-panel/components/StatusPanel.test.tsx src/features/status-panel/utils/checkpoint.test.ts src/features/status-panel/utils/policies/bridgeGovernancePolicies.test.ts` + `npm run typecheck` + `npm run check:governance-evidence-bridge` + `npm run check:checkpoint-policy-chain`] Validate S1.

## 2. S2 Gate Result Evidence

- [ ] 2.1 [P0][depends:1][write: `openspec/changes/advance-harness-governance-to-90/design.md` or implementation notes only if no code is changed][verify: canonical large-file artifact source chosen before implementation] Decide whether large-file result evidence consumes existing output or first adds a structured JSON report mode.
- [ ] 2.2 [P0][depends:2.1][write: `scripts/check-large-files.mjs`, `scripts/check-large-files.test.mjs` if JSON report mode is required][verify: pass/warn/fail/unknown and baseline regression semantics are test-covered] Add or confirm large-file structured result output.
- [ ] 2.3 [P0][depends:1][write: `openspec/changes/advance-harness-governance-to-90/design.md` or implementation notes only if no code is changed][verify: canonical heavy-test-noise artifact source chosen before implementation] Decide whether heavy-test-noise evidence consumes `.artifacts/heavy-test-noise.log` or adds a structured summary.
- [ ] 2.4 [P0][depends:2.3][write: `scripts/check-heavy-test-noise.mjs`, `scripts/check-heavy-test-noise.test.mjs` if structured summary is required][verify: advisory warning ceiling is preserved] Add or confirm heavy-test-noise structured result output.
- [ ] 2.5 [P0][depends:2.2,2.4][write: `src/features/governance/evidence/**`, related tests][verify: missing artifact, malformed artifact, CRLF/LF, Windows paths, pass/warn/fail/unknown covered] Convert gate artifacts into `GovernanceEvidence`.
- [ ] 2.6 [P1][depends:2.5][write: `src/features/status-panel/utils/policies/**`, related tests][verify: per-gate id/status/degradationReason visible in policy audit metadata] Feed parsed gate results into consolidated policy decisions.
- [ ] 2.7 [P0][depends:2.5][write: none][verify: `node --test scripts/check-large-files.test.mjs scripts/check-heavy-test-noise.test.mjs` + `npm run check:large-files:gate` + `npm run check:large-files:near-threshold` + `npm run check:governance-evidence-bridge`; run `npm run check:heavy-test-noise` if parser/test output changes] Validate S2.

## 3. S3 Domain Event Runtime Adoption

- [ ] 3.1 [P0][depends:1][write: implementation notes or `design.md` update if producer choice changes][verify: exactly one producer chosen; default recommendation is turn completed/failed, not high-frequency message delta] Select first runtime producer.
- [ ] 3.2 [P0][depends:3.1][write: selected producer file only, plus `src/features/threads/domain-events/**` if needed][verify: event emission uses internal controller; application-facing runtime remains subscribe-only] Implement bounded event emission.
- [ ] 3.3 [P0][depends:3.2][write: one governance-scoped consumer path, tests][verify: no persistence, transport, or new dashboard] Implement first bounded governance consumer.
- [ ] 3.4 [P0][depends:3.3][write: focused tests][verify: no duplicate event, no unbounded fan-out, unsubscribe remains idempotent] Add adoption regression tests.
- [ ] 3.5 [P0][depends:3.2-3.4][write: `scripts/check-agent-domain-event-adoption.mjs`, `package.json`][verify: `npm run check:agent-domain-event-adoption` fails when there is no real producer/consumer path and passes only for the selected bounded adoption path] Add domain-event adoption conformance checker.
- [ ] 3.6 [P0][depends:3.2-3.5][write: none][verify: `npm exec vitest run src/features/threads/domain-events/*.test.ts` + `npm run check:agent-domain-event-schema` + `npm run check:agent-domain-event-adoption` + `npm run typecheck`] Validate S3.

## 4. S4 Structural Substrate Evidence

- [ ] 4.1 [P1][depends:0][write: perf docs/scripts only if needed][verify: S-LL-1000 has browser-level evidence or explicit unsupported marker with reproducible reason] Close long-list browser evidence gap.
- [ ] 4.2 [P1][depends:0][write: perf docs/scripts only if needed][verify: `firstPaintMs`/`firstInteractiveMs` remain unsupported unless real Tauri/webview timing source exists] Close webview timing evidence gap without fake metrics.
- [ ] 4.3 [P1][depends:0][write: one selected hub slice only][verify: selected hub, before/after line count, extracted responsibility, public API compatibility, targeted tests, large-file gate result recorded] Continue hub split by one hub per slice.
- [ ] 4.4 [P1][depends:4.1-4.2][write: none][verify: `npm run perf:long-list:baseline` and/or `npm run perf:cold-start:baseline` + `npm run perf:baseline:aggregate` when touched] Validate S4.

## 5. Readiness Validation Bundle

- [ ] 5.1 [P0][depends:1-3][write: none][verify: `npm run typecheck`] Run typecheck.
- [ ] 5.2 [P0][depends:1-3][write: none][verify: `npm run check:governance-evidence-bridge` + `npm run check:checkpoint-policy-chain` + `npm run check:agent-domain-event-schema` + `npm run check:agent-domain-event-adoption` + `npm run check:engine-capability-matrix`] Run governance contract checks.
- [ ] 5.3 [P0][depends:1-4][write: none][verify: `npm run check:large-files:gate` + `npm run check:large-files:near-threshold`; run `npm run check:heavy-test-noise` when tests, parser output, governance scripts, or noisy paths change] Run sentries.
- [ ] 5.4 [P0][depends:5.1-5.3][write: none][verify: `openspec validate advance-harness-governance-to-90 --strict --no-interactive` + `openspec validate --all --strict --no-interactive`] Validate OpenSpec.
- [ ] 5.5 [P0][depends:5.1-5.4][write: none][verify: 90% floor evidence matrix recorded in `implementation-evidence.md`] Declare whether the implementation has reached the 90% minimum floor before proceeding to release-grade closure.

## 6. S6 Evidence Provenance And Replay

- [ ] 6.1 [P0][depends:1-2][write: `src/features/governance/evidence/**`, focused tests if needed][verify: consumed evidence carries source id and observed-at; parser/adapter identity is mandatory when parsed/adapted; artifact path/hash is mandatory when artifact-backed; unknown/advisory evidence carries degradation reason] Add release-grade provenance metadata to consumed governance evidence.
- [ ] 6.2 [P0][depends:6.1][write: governance replay fixtures under an existing test/fixture location only][verify: fixtures use workspace-relative paths and contain no user-specific absolute paths] Add captured replay fixtures for representative pass/warn/fail/unknown governance evidence.
- [ ] 6.3 [P0][depends:6.2][write: focused tests][verify: captured fixtures create a frozen snapshot and reproduce deterministic checkpoint policy audit decisions without live filesystem or shell access] Add evidence replay regression coverage.
- [ ] 6.4 [P0][depends:6.1-6.3][write: none][verify: `npm exec vitest run src/features/governance/evidence src/features/status-panel/utils/policies src/features/status-panel/utils/checkpoint.test.ts` + `npm run check:governance-evidence-bridge` + `npm run check:checkpoint-policy-chain`] Validate S6.

## 7. S7 Cross-Platform Release Evidence

- [ ] 7.1 [P0][depends:2,6][write: focused parser tests only][verify: POSIX and Windows-style paths normalize to the same governance source identity] Add or confirm path separator compatibility coverage.
- [ ] 7.2 [P0][depends:2,6][write: focused parser tests only][verify: LF and CRLF artifacts parse equivalently] Add or confirm newline compatibility coverage.
- [ ] 7.3 [P0][depends:2,6][write: focused tests or implementation evidence][verify: no new governance parser/check assumes case-sensitive filesystem semantics without explicit documentation] Add or confirm case-sensitivity compatibility coverage.
- [ ] 7.4 [P0][depends:2,6][write: scripts/package metadata only if needed][verify: governance checks are Node/npm entrypoints and avoid POSIX-only inline shell for cross-platform required paths] Confirm shell and command compatibility.
- [ ] 7.5 [P0][depends:7.1-7.4][write: `openspec/changes/advance-harness-governance-to-90/implementation-evidence.md`][verify: each macOS/Windows/Linux row records `platform`, `command`, `runUrlOrArtifactPath`, `date`, `commit`, `result`, and `qualifier`; unresolved Windows/Linux qualifiers cap the claim below 99%] Record platform evidence.
- [ ] 7.6 [P0][depends:7.1-7.5][write: none][verify: `npm run typecheck` + `node --test scripts/check-large-files.test.mjs scripts/check-heavy-test-noise.test.mjs` + `npm run check:large-files:gate` + `npm run check:large-files:near-threshold`] Validate S7.

## 8. S8 Recovery And Operator Handoff

- [ ] 8.1 [P0][depends:1-3,6][write: focused tests][verify: missing workspace id and missing artifact keep checkpoint stable and degrade to `unknown` or advisory `warn`] Add missing-input recovery coverage.
- [ ] 8.2 [P0][depends:1-3,6][write: focused tests][verify: malformed and stale artifacts record degradation reason and do not become fresh passing evidence] Add malformed/stale artifact recovery coverage.
- [ ] 8.3 [P0][depends:3][write: focused tests][verify: duplicate events/evidence do not create duplicate blocking decisions; unsubscribe remains idempotent] Add duplicate and unsubscribe recovery coverage.
- [ ] 8.4 [P0][depends:8.1-8.3][write: `openspec/changes/advance-harness-governance-to-90/implementation-evidence.md` or runbook section][verify: operator can identify missing evidence, rerun commands, classify advisory vs blocking warnings, and rollback each slice] Write operator recovery handoff.
- [ ] 8.5 [P0][depends:8.1-8.4][write: none][verify: `npm exec vitest run src/features/governance/evidence src/features/status-panel src/features/threads/domain-events` + `npm run check:governance-evidence-bridge` + `npm run check:checkpoint-policy-chain` + `npm run check:agent-domain-event-schema` + `npm run check:agent-domain-event-adoption`] Validate S8.

## 9. Release-Grade Completion Review

- [ ] 9.1 [P0][depends:5-8][write: `openspec/changes/advance-harness-governance-to-90/implementation-evidence.md`][verify: readiness percentage, commands, dates, platform qualifiers, replay fixtures, sentry results, and residual risks documented] Produce final 95%-99% readiness report.
- [ ] 9.2 [P0][depends:9.1][write: none][verify: 95% claim has provenance, replay, recovery, and operator handoff; 99% claim has actual three-platform evidence instead of unresolved qualifiers] Check percentage claim against evidence gates.
- [ ] 9.3 [P0][depends:9.2][write: main specs via sync/archive flow only][verify: sync/archive prerequisites listed; no archive before tasks and validation are complete] Prepare sync/archive handoff.
- [ ] 9.4 [P0][depends:9.1-9.3][write: none][verify: `openspec validate advance-harness-governance-to-90 --strict --no-interactive` + `openspec validate --all --strict --no-interactive` + `python3 .claude/skills/osp-openspec-sync/scripts/validate-consistency.py --project-path . --full`] Validate release-grade closure.

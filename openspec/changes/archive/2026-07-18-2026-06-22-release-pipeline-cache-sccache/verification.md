# Verification: 2026-06-22-release-pipeline-cache-sccache

## Status

**APPROVED FOR FAILED-EXPERIMENT ARCHIVE** — 11/13 tasks complete; live SLO failed.

## Confirmed Evidence

- Proposal, design, tasks, and release-cache delta spec exist.
- Static workflow/configuration work represented by completed tasks is recorded in the task set.
- Live evidence: GitHub Actions `workflow_dispatch` run
  `29515796712` (2026-07-16) completed successfully.
- macOS x86_64 job: approximately 41m44s; `Build app bundle`: approximately 37m36s.
- macOS aarch64 job: approximately 30m11s; `Build app bundle`: approximately 27m03s.
- x86_64 `rust-cache` reported a full hit, while sccache compile requests were 0.
  aarch64 reported 2 compile requests, both not cacheable. The added sccache
  layer is effectively dormant on this path.
- All platform artifacts uploaded. Compared with successful run `29466785734`,
  size deltas were approximately:
  - macOS x86_64: +0.35%
  - macOS aarch64: +0.35%
  - Windows: +1.18%
  - AppImage: +0.11%
  All remain below the proposal's 5% contract.
- No cache quota or `cache size exceeded` error was observed.

## Unresolved Follow-Up

- Record the SLO miss as residual risk and open a bounded follow-up for the
  Tauri build-step bottleneck / runner architecture / cargo invocation.
- Do not claim the cache configuration achieved the intended speedup.
- On 2026-07-18, the product owner explicitly authorized closing this change
  without continuing the cache experiment.

## Fallback

If sccache fails or becomes incompatible on a runner, disable the
`mozilla-actions/sccache-action` step and its `RUSTC_WRAPPER` /
`SCCACHE_GHA_ENABLED` environment while retaining `swatinem/rust-cache@v2`.

## Archive Decision

Archive as a failed performance experiment with the two remaining tasks left
unchecked. Skip delta-spec synchronization: the proposed
`release-pipeline-ci-cache-perf` contract requires sccache as a successful
cold-start fallback, but live evidence shows that requirement did not achieve
its intended performance outcome. Any renewed release-build optimization must
start as a bounded follow-up change rather than extending this archive.

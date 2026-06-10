# bundle-chunking-performance Specification

## Purpose
TBD - created by archiving change optimize-bundle-chunking. Update Purpose after archive.
## Requirements
### Requirement: Bundle Chunking MUST Preserve Tauri Startup Semantics

The system MUST optimize bundle composition without delaying the desktop startup critical path: app shell initialization, workspace/session restore, active thread rendering, and composer basic input readiness.

#### Scenario: critical startup modules remain eagerly reachable

- **WHEN** bundle chunking is changed
- **THEN** startup-critical modules MUST remain reachable without user-visible lazy loading stalls
- **AND** any lazy boundary added by this change MUST be documented as non-critical-path

### Requirement: Bundle Size Changes MUST Be Compared Against S-CS-COLD Baseline

The system MUST compare bundle output against the recorded `S-CS-COLD` baseline (`bundleSizeMain = 1858800 bytes`, `bundleSizeVendor = 163595 bytes`).

#### Scenario: main bundle reduction is measured or explained

- **WHEN** cold-start baseline is rerun
- **THEN** `bundleSizeMain` MUST either decrease versus `1858800 bytes` or the change MUST document why no decrease is achievable
- **AND** `bundleSizeVendor` MUST NOT grow substantially without an explicit explanation

### Requirement: Unsupported Webview Timing MUST Remain Explicit

The system MUST NOT invent `firstPaintMs` or `firstInteractiveMs` values while the current instrumentation reports them as unsupported.

#### Scenario: unsupported timing is not silently replaced

- **WHEN** perf baselines are updated
- **THEN** unsupported timing fields MUST remain explicitly marked unsupported unless a real Tauri/webview timing source is introduced

### Requirement: Domain Chunks MUST Be Explainable

Manual chunks and lazy imports introduced by this capability MUST be organized around low-frequency domains or heavy optional surfaces, not arbitrary dependency names.

#### Scenario: chunk rationale is reviewable

- **WHEN** a new chunk boundary is introduced
- **THEN** the implementation notes or PR description MUST identify its domain, why it is low-frequency, and how to rollback it

### Requirement: Bundle Chunking MUST Be Validated By Existing Perf Gates

The system MUST use existing perf scripts rather than adding new external browser tooling in this change.

#### Scenario: existing cold-start scripts validate the change

- **WHEN** validation runs
- **THEN** `npm run perf:cold-start:baseline` and `npm run perf:baseline:aggregate` MUST complete successfully
- **AND** `openspec validate optimize-bundle-chunking --strict --no-interactive` MUST pass

### Requirement: Bundle Chunking Gate MUST Enforce Structured Size Budgets

bundle chunking gate MUST 读取 built frontend assets，计算 raw/gzip size，并与 structured budget config 对比。

#### Scenario: asset sizes are grouped by stable budget id

- **WHEN** `npm run check:bundle-chunking` 在 production build 后运行
- **THEN** checker MUST read assets under `dist/assets`
- **AND** checker MUST compute raw bytes and gzip bytes for matching js, mjs, and css assets
- **AND** checker MUST report grouped results for app JS, app CSS, heavy optional vendor chunks, and total js/mjs/css payload

#### Scenario: hard-fail budgets exit non-zero

- **WHEN** budget group 配置为 fail mode 且存在 hard-fail threshold
- **AND** measured gzip size exceeds that threshold
- **THEN** `npm run check:bundle-chunking` MUST exit non-zero
- **AND** output MUST identify budget id, matched files, measured size, target, and hard-fail threshold

#### Scenario: advisory budgets do not block staged optimization rollout

- **WHEN** budget group 配置为 advisory mode
- **AND** measured size exceeds target or future hard-fail threshold
- **THEN** checker MUST print over-budget status
- **AND** checker MUST NOT exit non-zero solely because of that advisory group

### Requirement: Heavy Optional Chunks MUST Not Be Reported As Startup-Safe Without Evidence

bundle gate MUST 区分 measured startup-path isolation 与 unknown eagerness status，避免把 unknown 写成 pass。

#### Scenario: startup eagerness evidence is explicit

- **WHEN** checker evaluates heavy optional groups such as Mermaid, CodeMirror, document preview, or PDF preview
- **THEN** checker MUST report startup eagerness as `measured-lazy`, `measured-eager`, or `not-measured`
- **AND** `measured-eager` for a fail-mode heavy optional chunk MUST fail the gate
- **AND** `not-measured` MUST NOT be described as startup-safe


# Design / 设计

## Trace Milestones / 里程碑

Recommended milestone names:

- `user-send-committed`
- `runtime-process-started`
- `first-engine-delta-ingress`
- `batch-flush-start`
- `batch-flush-end`
- `reducer-commit`
- `first-visible-row-render`
- `first-visible-text-growth`
- `terminal-settlement`

## Evidence Shape / 证据结构

Per-turn summary should include ids/correlation dimensions, milestone timings, deltas, counts, max queue depth where available, and evidence class. It MUST NOT include prompt, assistant body, tool output body, or terminal content.

## Budget Candidates / 预算候选

- visible text lag P95: first delta ingress -> first visible text growth.
- batch flush duration P95.
- reducer amplification: action count / visible growth ratio or equivalent proxy.
- terminal settlement lag: last runtime activity -> terminal settled.

## Diagnostics Overhead / 诊断开销

Trace capture must be bounded and should be enabled in dev/perf builds or sampling mode. Long sessions should store summary records instead of unbounded per-delta logs.

## Classification / 证据分级

Browser/Tauri WebView timing with visible render signal can be `measured`; jsdom or fixture-only replay remains `proxy`. Reports must not upgrade proxy evidence to release-grade claims.

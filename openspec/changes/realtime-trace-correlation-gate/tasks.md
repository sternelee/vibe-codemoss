# Tasks / 任务

## Planning / 规划

- [ ] Inventory current realtime diagnostics, batcher, reducer, timeline render, and perf report artifacts.
- [ ] Define turn trace id propagation boundary.
- [ ] Define measured/proxy evidence classification for visible render timing.

## Implementation / 实施

- [ ] Add correlated trace milestones from ingress to visible render and terminal settlement.
- [ ] Store bounded per-turn trace summaries.
- [ ] Add realtime visible lag/render amplification budgets to perf report artifacts.
- [ ] Preserve batching, virtualization, and scroll anchoring behavior.
- [ ] Ensure diagnostics are content-safe and bounded.

## Validation / 验证

- [ ] Add focused tests for trace summary and budget classification.
- [ ] Add long live assistant text + reasoning + tool blocks regression scenario where feasible.
- [ ] Run `npm run perf:realtime:report`.
- [ ] Run `npm run perf:realtime:boundary-guard`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.
- [ ] Run `openspec validate realtime-trace-correlation-gate --strict --no-interactive`.

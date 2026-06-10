# realtime-trace-correlation-gate

## Summary / 摘要

建立 realtime ingress -> batch flush -> reducer commit -> first visible render -> visible text growth -> terminal settlement 的 trace correlation，并把 visible lag/render amplification 纳入 runtime performance budget gate。

## Problem / 问题

`P0-08` 指出 realtime path 已有 batching、virtualization、stream latency diagnostics、visible output stall detection，但 runtime evidence 仍缺少端到端关联。当前 `S-RS-FT` first token latency 在 fixture baseline 中为 `5000 ms`，visible lag risk 仍为 high。

没有 correlation 时，慢体验会被混成一个结果：无法区分 upstream first-token delay、backend forwarding stall、frontend batching/reducer 放大、React render lag、terminal pressure 或 scroll anchoring 问题。

## Goals / 目标

- 每个 turn 建立稳定 trace id，贯穿 runtime ingress、batcher、reducer、visible render、terminal settlement。
- 采集关键 timestamps：send committed、runtime started、first delta ingress、batch flush、reducer commit、first visible row、first visible text growth、terminal settlement。
- 增加 P95 budgets：visible text lag、render amplification、batch flush duration、terminal settlement lag。
- 将 evidence 写入 bounded diagnostics/perf artifacts，不记录 prompt、assistant body、terminal content。
- 更新 runtime evidence gates，让 realtime visible lag 从 proxy 走向 measured evidence。

## Non-Goals / 非目标

- 不重写 realtime batcher 或 virtualization 架构。
- 不改变 provider wire protocol 或 Tauri command payload。
- 不把所有 diagnostics 永久上报；本 change 只定义 bounded local/dev/perf evidence。
- 不为降低数字牺牲 scroll anchoring 或 message correctness。

## Approach / 方案

1. 定义 `turnTraceId` 和 correlation dimensions：workspaceId、threadId、engine、provider、model、platform。
2. 在 event ingress、batch flush、reducer commit、render-visible hook、terminal settlement 记录 bounded milestones。
3. 聚合为 per-turn trace summary，避免事件无限增长。
4. 将 trace summary 接入 `scripts/realtime-perf-report.ts` 或现有 runtime evidence artifact。
5. 增加 budget gate：visible text lag P95、render amplification、flush cost、terminal settlement lag。
6. 增加 long live assistant text + reasoning + tool blocks regression scenario。

## Risks / 风险

- diagnostics 本身可能造成 overhead，必须 bounded、sampled 或 dev/perf gated。
- React visible render timing 不一定在 jsdom 中可靠，需要明确 `measured` vs `proxy` evidence class。
- terminal pressure 和 frontend render lag 的 correlation 只能在 evidence surfaced 时成立，不能从单侧数据过度推断。

## Acceptance Criteria / 验收口径

- Realtime perf report 能按 turn 输出 correlated milestone summary。
- `runtime-evidence-gates.md` 可区分 measured/proxy/manual-only/unsupported realtime visible lag evidence。
- Long streaming scenario 保持 progressive reveal、scroll anchoring、reasoning/tool blocks 可见性。
- Diagnostics payload 不包含 prompt text、assistant output body 或 terminal output content。

## Validation / 验证

- Focused realtime batcher / diagnostics tests。
- `npm run perf:realtime:report`
- `npm run perf:realtime:boundary-guard`
- `npm run typecheck`
- `npm run lint`
- `openspec validate realtime-trace-correlation-gate --strict --no-interactive`

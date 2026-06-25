## 1. Evidence and Boundary Audit

- [x] 1.1 Map current five-zone data dependencies for topbar, sidebar, right panels, Composer, and conversation canvas.
- [x] 1.2 Identify broad props/selectors that let canvas realtime churn invalidate interaction lanes.
- [x] 1.3 Audit long-running resource owners: listeners, timers, RAF, idle callbacks, Markdown caches, virtualization measurement maps, diagnostics buffers.
- [ ] 1.4 Add failing/guard tests for active-stream interaction latency: topbar new-session, session tab switch, sidebar click, Composer typing.

## 2. Interaction Lane Isolation

- [ ] 2.1 Introduce or extend lane scheduling policy for `interaction`, `canvas`, and `background` work.
- [ ] 2.2 Narrow AppShell/layout props so interaction lanes receive pressure signals, not full canvas snapshots.
- [x] 2.3 Keep topbar/session controls referentially stable during canvas stream bursts.
- [x] 2.4 Keep Composer local typing path independent from canvas projection and heavy render state.

## 3. Canvas Lane Backpressure and Layout Stability

- [ ] 3.1 Route canvas heavy derivation/rendering through a bounded canvas lane.
- [ ] 3.2 Coalesce non-terminal canvas snapshots while preserving latest semantic state and terminal settlement.
- [ ] 3.3 Preserve measured/bounded placeholder heights so lightweight/virtualized canvas does not stretch blank blocks.
- [ ] 3.4 Add regression coverage for the oversized blank canvas placeholders reported by the user.

## 4. Long-Run Cleanup

- [ ] 4.1 Add cleanup ownership for realtime/canvas listeners, timers, RAF/idle callbacks, caches, and measurement maps.
- [ ] 4.2 Add tests proving teardown cancels late callbacks and prevents post-unmount state writes.
- [x] 4.3 Extend renderer diagnostics with bounded resource-retention evidence.
- [x] 4.4 Ensure diagnostics remain privacy-safe and capped.

## 5. Verification

- [ ] 5.1 Run focused Vitest suites for messages, composer responsiveness, topbar/session tabs, renderer diagnostics, and thread realtime contracts.
- [ ] 5.2 Run `npm run typecheck`.
- [ ] 5.3 Run `npm run lint`.
- [ ] 5.4 Run `npm run check:runtime-contracts`.
- [ ] 5.5 Run `npm run check:large-files`.
- [ ] 5.6 Run `npm run check:heavy-test-noise`.
- [ ] 5.7 Run `openspec validate isolate-conversation-canvas-runtime --strict --no-interactive`.

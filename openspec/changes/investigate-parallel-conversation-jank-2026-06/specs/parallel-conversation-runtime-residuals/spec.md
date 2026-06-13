# parallel-conversation-runtime-residuals delta

## ADDED Requirements

### Requirement: Parallel Conversation Runtime Residuals MUST Be Diagnosable From Webview

The client MUST expose a webview-callable diagnostic surface that lets an operator (developer, QA, or on-call) inspect, from DevTools, all seven layers of state that contribute to the "parallel conversation jank" symptom:

1. Active child process count per workspace (Rust `ClaudeSession.active_processes`).
2. The current value of every `ccgui.perf.*` runtime flag.
3. The 30-second Markdown re-render rate and `findProgressiveRevealBoundary` p95 latency.
4. The `useThreadEventHandlers` `handlers` useMemo rebuild count.
5. The Home sidebar DOM node count and `backgroundActivityByThread` rebuild cost.
6. The detached `ImageBitmap` / `HTMLImageElement` count from `convertFileSrc` resources.
7. The setTimeout queue size and lazyResume / sharedSessionSync timer reference map sizes.

#### Scenario: operator pulls diagnostic snapshot from DevTools

- **WHEN** the operator runs `await window.__TAURI__.core.invoke('get_jank_diagnostics')` in DevTools
- **THEN** the response MUST contain the seven sections above with a numeric value for each
- **AND** each section MUST be timestamped with the time of sampling
- **AND** the response MUST fit in < 16 KB JSON so it can be logged or pasted into a bug report

#### Scenario: diagnostic command survives flag degradation

- **WHEN** every `ccgui.perf.*` flag is set to `0` in `localStorage`
- **THEN** `get_jank_diagnostics` MUST still return a valid response (it MUST NOT depend on batching, no-op guard, or incremental derivation flags)
- **AND** the response MUST label each section with `evidenceClass: "measured"` or `evidenceClass: "proxy"` so the operator can judge reliability

#### Scenario: child process count matches OS pgrep

- **WHEN** the operator runs `pgrep -f claude | wc -l` on the host
- **AND** runs `get_jank_diagnostics` in the webview
- **THEN** the sum of `activeProcessIds` lengths across workspaces MUST be within ±1 of the pgrep count (allowing for transient spawn/exit)
- **AND** the operator MUST be able to attribute the gap to a specific workspace via the diagnostic JSON

## MODIFIED Requirements

The following requirements are follow-up repair contracts for `fix-parallel-conversation-runtime-residuals-2026-06`. This investigation change records calibrated acceptance criteria and does not implement the product code paths.

### Requirement: ClaudeSession MUST Release Child Processes On Drop (Root Cause 1)

`ClaudeSession` MUST kill every child process still present in its `active_processes: Mutex<HashMap<String, Child>>` map when the last `Arc<ClaudeSession>` reference is dropped. Existing explicit cleanup paths (normal turn completion, setup failure, disposed startup, interrupt, and session removal) MUST remain intact; `Drop` is the final safety net, not the primary lifecycle path.

#### Scenario: dropping the last Arc reference kills the child

- **WHEN** `Arc::strong_count(&session) == 1` and that last `Arc` is dropped
- **THEN** every child in `active_processes` MUST receive SIGTERM (Unix) or be terminated via `taskkill /T /F` (Windows) within 1 second
- **AND** `child.try_wait()` MUST return `Ok(Some(_))` within 5 seconds

#### Scenario: Drop is non-blocking

- **WHEN** `Drop::drop` runs for a `ClaudeSession` with N active children
- **THEN** `drop` MUST return within 10 milliseconds (it MUST NOT await child exit)
- **AND** it MUST call a non-blocking platform-appropriate kill path synchronously, then let the existing async lifecycle/reconciler perform best-effort reaping

#### Scenario: long-running child is not killed by background reconciler within 5 minutes

- **WHEN** a turn is actively streaming and the child produces IO within the last 5 minutes
- **THEN** the background reconciler MUST NOT kill the child
- **AND** the reconciler MUST emit a debug log entry when it skips a child

#### Scenario: stalled child is killed by background reconciler after 5 minutes

- **WHEN** a child's last IO timestamp is older than 5 minutes
- **THEN** the background reconciler MUST kill the child and emit a `turn/stalled` event
- **AND** the workspace's `active_process_ids` MUST drop by 1 within 1 second

### Requirement: Performance Flag Default Values MUST Be Self-Documenting And Resettable (Root Cause 2)

The `ccgui.perf.*` runtime flag system MUST be self-documenting (each default value annotated in source) and MUST expose a single-command reset path so a degraded flag set can be restored to defaults without manually editing `localStorage`.

#### Scenario: every flag has a source comment

- **WHEN** a developer reads `src/features/threads/utils/realtimePerfFlags.ts`
- **THEN** every exported `is*Enabled()` function MUST have a `// Default: <true|false>` and `// Rationale: ...` comment within 5 lines above the function body
- **AND** the file MUST contain a table of all 8 flags with their production default, test default, and the metric they guard

#### Scenario: getActiveFlags returns current state

- **WHEN** the operator runs `getActiveFlags()` from DevTools (or imports it from a debug entry)
- **THEN** the response MUST be a `Record<string, boolean>` of all 8 flags with their currently-effective values
- **AND** it MUST include a `source` field per flag indicating `localStorage` or `default`

#### Scenario: Settings panel has Reset button

- **WHEN** the operator opens Settings and clicks "Reset performance flags"
- **THEN** all 8 `ccgui.perf.*` keys MUST be removed from `localStorage`
- **AND** a modal MUST prompt the operator to reload the window
- **AND** after reload, `getActiveFlags()` MUST return the production defaults

#### Scenario: lazy read survives hot reload

- **WHEN** the operator changes a flag in `localStorage` while the window is open
- **THEN** a `useSyncExternalStore`-based reader MUST pick up the change within 1 frame (MUST NOT require full reload)
- **AND** the old cached-flag behavior MUST NOT silently override the new value

### Requirement: Progressive Reveal Cadence MUST Behave Reasonably For Long Turns (Root Cause 3)

The `Markdown` component's `PROGRESSIVE_REVEAL_STEP_MS = 28ms` cadence MUST be self-adaptive: short reveals flush immediately, long reveals pace at a cadence that does not consume more than 60% of one CPU core at steady state. The `findProgressiveRevealBoundary` helper MUST be cheap enough to run every frame for 8000+ character inputs.

#### Scenario: pending < 140 chars short-circuits

- **WHEN** `pendingText.length <= PROGRESSIVE_REVEAL_SMALL_PENDING_CHARS` (140)
- **THEN** `resolveProgressiveRevealValue` MUST return `targetValue` directly (no boundary scan, no setTimeout scheduling)
- **AND** the helper MUST NOT enter `findProgressiveRevealBoundary`

#### Scenario: visible > 3000 chars uses measured adaptive step

- **WHEN** `visibleValue.length >= PROGRESSIVE_REVEAL_LARGE_VISIBLE_CHARS` (3000)
- **THEN** `setTimeout(..., adaptiveStepMs)` MUST use `resolveAdaptiveProgressiveRevealStepMs`, not the hardcoded 28ms
- **AND** the follow-up change MUST keep or tighten the current adaptive cadence based on profiler evidence, with ≥ 56ms required only if the current large-visible cadence breaches CPU/render budgets

#### Scenario: findProgressiveRevealBoundary scales linearly

- **WHEN** `findProgressiveRevealBoundary(pendingText, ...)` is called with `pendingText.length == 8000`
- **THEN** the function MUST complete within 1 millisecond on a 2025-era laptop (current implementation: ≤ 3ms with 6 sequential regex scans)
- **AND** the merged single-pass implementation MUST NOT regress on the 1000-character input case (must stay ≤ 0.5ms)

#### Scenario: resolveProgressiveRevealValue memoized

- **WHEN** the same `(visibleValue, targetValue, preferredChunkChars)` triple is passed to `resolveProgressiveRevealValue` twice in succession
- **THEN** the second call MUST return the cached result (MUST NOT re-execute `findProgressiveRevealBoundary`)
- **AND** the memoization cache key MUST include `preferredChunkChars` so changes invalidate correctly

### Requirement: handlers useMemo MUST Be Split By Concern (Root Cause 4)

The `useThreadEventHandlers` `handlers` useMemo MUST be split into 2-3 groups by event concern, and the "infrastructure" callbacks (flush / mark / emit / finalize / quarantine) MUST have stable references across the lifetime of the hook so that consumer subscriptions (especially `useAppServerEvents`) do not see churn.

#### Scenario: handlers split into streaming/lifecycle/diagnostic groups

- **WHEN** `useThreadEventHandlers` is called
- **THEN** it MUST return an object with at most 3 keys: `streamingHandlers`, `lifecycleHandlers`, `diagnosticHandlers`
- **AND** each group MUST be its own `useMemo` with deps restricted to the callbacks in that group
- **AND** the overall return shape MUST be backward-compatible with `useAppServerEvents`

#### Scenario: infrastructure callbacks have stable references

- **WHEN** the hook is called twice with the same deps
- **THEN** `flushPendingRealtimeEvents` / `markRealtimeTurnTerminal` / `emitTurnDomainEvent` / `finalizeTurnDiagnostic` / `quarantineCodexTurn` MUST have identical references across both calls
- **AND** this MUST hold even when consumer state changes (e.g., a new thread ID is dispatched)

#### Scenario: rebuild frequency drops under load

- **WHEN** a 30-second long turn streams 200+ deltas
- **THEN** each of the 3 handler groups MUST rebuild ≤ 5 times total (currently: `handlers` rebuilds 20+ times)
- **AND** `useAppServerEvents`'s `handlersRef.current` MUST update ≤ 5 times per turn

### Requirement: Long Session Lists MUST Be Virtualized (Root Cause 5)

Any Home/recent conversation/thread sidebar surface that can render 100+ session rows MUST use `useVirtualizer` from `@tanstack/react-virtual` so that DOM node count stays bounded regardless of the number of sessions. The `backgroundActivityByThread` projection MUST be lazy (computed per visible item, not per workspace).

#### Scenario: 200 sessions render bounded DOM nodes

- **WHEN** a workspace has 200 threads
- **THEN** the relevant list surface MUST render ≤ 20 thread DOM nodes at any time (overscan ≤ 5)
- **AND** scrolling MUST trigger virtualization with 60fps frame time

#### Scenario: backgroundActivityByThread is lazy

- **WHEN** the sidebar is rendered with 100+ threads
- **THEN** `backgroundActivityByThread` MUST be computed only for the threads currently in the viewport (plus overscan)
- **AND** a `Map<threadId, projection>` LRU cache (limit 200) MUST be used to avoid recomputation when scrolling back

#### Scenario: workspace switch does not rebuild the full projection

- **WHEN** the active workspace changes from `ws_A` (10 threads) to `ws_B` (200 threads)
- **THEN** `backgroundActivityByThread` for `ws_B` MUST be computed incrementally as items enter the viewport
- **AND** `ws_A`'s cached projections MUST be retained in the LRU for fast switch-back (no full recomputation)

### Requirement: Image Resources From convertFileSrc MUST Be Released On Session Switch (Root Cause 6)

The `LocalImage` component MUST release `convertFileSrc`-backed image resources when the image leaves the viewport or the owning session is no longer the active session. The existing `mediaResourceOwners` registry MUST be extended (or a parallel registry created) to track these resources so that long conversations do not leak `ImageBitmap` / GPU textures.

#### Scenario: image leaves viewport, src is cleared

- **WHEN** an `LocalImage` element exits the viewport IntersectionObserver root
- **THEN** the underlying `<img>.src` MUST be set to `''` within 1 second
- **AND** the `ImageBitmap` decoded for that src MUST be released by the WebView

#### Scenario: switching workspaces releases session images

- **WHEN** the active workspace changes
- **THEN** all `<img>` elements in the previous workspace's session list MUST have their `src` cleared within 5 seconds
- **AND** a `mediaResourceOwners`-style registry MUST track the released URLs (so re-entry re-allocates cleanly)

#### Scenario: convertFileSrc URLs are tracked

- **WHEN** a `LocalImage` mounts
- **THEN** the `convertFileSrc(filePath)` URL MUST be registered in the resource owner registry with `ownerId = <workspaceId>:<threadId>`
- **AND** when the image unmounts or the session is closed, the registry entry MUST be removed

#### Scenario: heap snapshot shows bounded ImageBitmap count

- **WHEN** the operator records 4 DevTools heap snapshots at 0/5/15/30 minutes during a long parallel conversation
- **THEN** the number of detached `ImageBitmap` / `HTMLImageElement` instances MUST stay below 50 at every snapshot
- **AND** the heap growth slope between snapshots MUST be < 5 MB per 5 minutes

### Requirement: useThreads Timers MUST Be Bounded And Idle-Scheduled (Root Cause 7)

All non-critical timers in `useThreads` (`lazyResume` / `sharedSessionSync` / refresh / debug) MUST be deduplicated per workspace, scheduled via `requestIdleCallback` or `scheduler.postTask` when available, and registered in a centralized `useRef<Map<string, Timeout>>` so they are cleared on unmount or dep change.

#### Scenario: lazyResume is per-workspace, not per-session

- **WHEN** 5 sessions in the same workspace all trigger lazy resume
- **THEN** at most 1 timer MUST be scheduled for that workspace
- **AND** the timer MUST iterate the 5 sessions in a single callback

#### Scenario: sharedSessionSync uses idle callback

- **WHEN** `requestIdleCallback` is available
- **THEN** `sharedSessionSync` MUST be scheduled via `requestIdleCallback` (not `setTimeout`)
- **AND** it MUST fall back to `setTimeout` only if `requestIdleCallback` is unavailable

#### Scenario: heartbeat/reconnect get jitter

- **WHEN** 5 workspaces reconnect simultaneously
- **THEN** the reconnect timers MUST fire with a ±20% jitter spread (so they do not all fire on the same frame)
- **AND** the average frame time over the reconnect burst MUST stay below 50ms

#### Scenario: timers cleared on unmount

- **WHEN** `useThreads` unmounts
- **THEN** every entry in the timer registry MUST be cleared
- **AND** a test MUST assert that the registry size is 0 after unmount

#### Scenario: timer queue stays small

- **WHEN** 5 workspaces are active with 3 sessions each
- **THEN** the size of the timer registry MUST stay below 20
- **AND** the DevTools Performance "Timer Fire" event density MUST stay below 5 events per second on average

## Out of Scope (Recorded As Follow-Up)

The following are explicitly out of scope for `fix-parallel-conversation-runtime-residuals-2026-06` (the follow-up change that implements the fixes) and are recorded for future iterations:

- Cold-start first-paint / first-interactive measurement (`S-CS-COLD/firstPaintMs` / `firstInteractiveMs`). These need real Tauri/WebView sessions and are tracked separately.
- Bundle size further reduction below 1100000 bytes-gzip. Current 1052505 is below the hard-fail threshold.
- WebView-level GPU texture pool tuning (driver-specific, requires per-platform profiling).
- Replacement of `@tanstack/react-virtual` with a different virtualizer library.
- Migration of timers off `setTimeout` to Web Workers (architectural change, defer to a separate proposal).

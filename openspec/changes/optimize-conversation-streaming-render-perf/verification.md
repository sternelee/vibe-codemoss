# Verification — optimize-conversation-streaming-render-perf

## Automated (pass now)

- [x] `npm run typecheck` — clean.
- [x] `npx vitest run src/services/events.test.ts` — event coalescing covered
  (added cases for drop-eligible collapse + non-drop-eligible preservation).
- [x] `npx vitest run src/features/messages` — 584 passed / 7 skipped. The 2
  `GenericToolBlock.test.tsx` failures are **pre-existing on base `ea338fae`**
  (verified by running that test on a clean BASE worktree: 2 failed | 24 passed),
  unrelated to this change (the pack does not touch that file).

## Manual — DEFERRED to next rebuild (authored during git freeze)

- [ ] Re-record the streaming perf trace (Settings → Other → "Copy performance
  report") during a long streamed response; compare main-thread time, frame gaps,
  and CPU against the pre-fix capture referenced in
  `docs/plans/2026-07-05-chat-scroll-and-streaming-perf-plan.md`.
- [ ] Visual check: working shimmer / ingress spinner / agent icon animate
  smoothly; Bash output scrolls without flashing the whole list.
- [ ] Correctness spot-check: settled dedup/action-target behavior is unchanged
  from before.

## Notes

- All four fixes are guarded fast-paths with a fallback to the existing full
  computation; the coalescing reuses the existing `appServerEventDropPolicy`.
- This pack is independent of the scroll-owner / jump-controls stack (no shared
  files beyond `Messages.tsx`, which cherry-picked clean onto BASE).

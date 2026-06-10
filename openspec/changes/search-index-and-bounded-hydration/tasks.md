# Tasks / 任务

## Planning / 规划

- [x] Inventory unified search providers and raw data dependencies.
- [ ] Define index item schema, source version keys, and invalidation rules.
- [x] Define hydration concurrency and partial-result semantics.

## Implementation / 实施

- [ ] Add per-workspace normalized search index builders.
- [ ] Rebuild indexes incrementally when source versions change.
- [x] Cache recency map outside hot query compute path.
- [x] Limit global workspace hydration concurrency and prioritize active workspace.
- [ ] Add cancellation/stale query guard for async provider search.
- [x] Add provider-level timing in `reportSearchMetrics`.

## Validation / 验证

- [ ] Add index invalidation and query result regression tests.
- [x] Add bounded hydration and stale query tests.
- [x] Run focused search tests.
- [x] Run `npm run typecheck`.
- [x] Run `npm run lint`.
- [ ] Record query elapsed/candidate evidence for representative fixture.
- [x] Run `openspec validate search-index-and-bounded-hydration --strict --no-interactive`.

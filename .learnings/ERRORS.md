# Command Errors

## [ERR-20260715-001] focused_vitest_via_batched_wrapper

**Logged**: 2026-07-15T00:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary

`npm run test -- --run <file>` cannot run a focused suite because the repository batch wrapper accepts only `--include-heavy`.

### Error

```text
Error: Unknown argument: --run
```

### Context

- Attempted focused verification for `useWorkspaceDropZone.test.ts`.
- `scripts/test-batched.mjs` owns the `npm test` entry and rejects Vitest passthrough arguments.

### Suggested Fix

Use `npx vitest run <test-file>` for focused suites; reserve `npm test` for the repository batch runner.

### Metadata

- Reproducible: yes
- Related Files: scripts/test-batched.mjs, package.json

### Resolution

- **Resolved**: 2026-07-15T00:00:00+08:00
- **Notes**: Switched focused verification to the repository's direct `vitest run` pattern.

---

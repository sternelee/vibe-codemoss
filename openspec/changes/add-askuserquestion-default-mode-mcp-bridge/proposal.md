## Why

Claude's `AskUserQuestion` — the structured, one-tap, mid-turn ask — is only
exposed by the CLI as a native tool **in plan mode**. In `default` / `acceptEdits`
(where users actually work) the native tool is permission-gated, so an agent
cannot pause mid-turn to ask the user a structured question. Users had to drop to
plan mode, or the model fell back to plain-text questions that don't gate the
send queue and can be answered late or lost.

The existing `codex-chat-canvas-user-input-elicitation` spec already governs how a
`RequestUserInput` card **renders** and how its response **round-trips**, but it
has no requirement for the mechanism that makes AskUserQuestion reachable outside
plan mode at all, for the CLI fetch-timeout the mechanism needs, or for holding
the composer queue while an ask is open. This change adds those three
requirements and the implementation behind them.

## 目标与边界

- Expose `AskUserQuestion` as an **allowed in-process MCP tool** in non-plan
  modes, reusing the existing `RequestUserInput` card + `respond_to_server_request`
  round-trip for rendering and settlement — no new UI surface.
- Deliver the user's answer back to the originating live turn as the MCP
  `tool_result`, so the turn continues without a kill/resume cycle.
- Raise `MCP_TOOL_TIMEOUT` for the wired command so answers slower than the CLI's
  60s default fetch timeout still land (respecting an explicit user override).
- Hold the composer send queue for a thread while it has a pending ask, so queued
  messages don't start fresh turns and strand the answer.

## 非目标

- Do not change the shared question-card presentation, multi-question tabs, secret
  handling, or stale-settlement semantics already specified for
  `RequestUserInput` — this change only adds the MCP-origin reachability path and
  reuses the rest.
- Do not alter Codex / opencode / gemini engines — the wiring is `claude`-only.
- Do not add `--strict-mcp-config` (would disable the user's own MCP servers); the
  injection is purely additive.
- No change to plan mode, which keeps using the CLI's native AskUserQuestion tool.

## What Changes

- **New** `src-tauri/src/engine/claude/askuser_mcp.rs`: an in-process MCP server
  exposing a single `AskUserQuestion` tool; `mcp_config_json` + `allowed_tool_name`
  feed the CLI command; a global handle is started at app setup.
- **New** `src-tauri/src/engine/claude/user_input.rs`: routes an MCP-origin ask to
  the live turn's subscriber and awaits the answer via a per-request oneshot.
- `engine/claude.rs`: in non-plan modes, inject `--mcp-config` + allowed tool and
  set `MCP_TOOL_TIMEOUT=300000` (unless the user set it); `mcp_answer_waiters`
  map on the manager state; guard test that the timeout is raised when wired.
- `engine/{events,manager}.rs`, `event_conversion.rs`, `lib.rs`: `completed`
  lifecycle on `RequestUserInput`, manager plumbing, and app-setup server start.
- Frontend: `app-shell.tsx` derives `hasPendingUserInput` (workspace + thread
  scoped) and threads it through `useComposerController` into `useQueuedSend`,
  which holds the queue while an ask is pending; tests in `useQueuedSend.test.tsx`.

## Spec deltas

- `codex-chat-canvas-user-input-elicitation`: **ADDED** three requirements —
  non-plan MCP reachability, MCP fetch-timeout survival, and queue-hold-while-pending.

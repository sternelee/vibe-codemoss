## Verification

### 通过项

- Late-render/focus-follow focused Vitest: 2 files passed, 52 tests passed.
- Expanded scroll/Codex/Claude focused Vitest: 8 files passed, 76 tests passed, 5 skipped.
- Focused Vitest: 6 files passed, 61 tests passed, 5 skipped.
- Codex / Claude shared-surface focused tests: 5 files passed, 23 tests passed.
- `npm run typecheck`: passed.
- Changed-file ESLint: passed.
- `git diff --check`: passed.
- `openspec validate --all --strict --no-interactive`: 404 passed, 0 failed.
- `npm run check:large-files`: report mode completed without新增本变更违规。

### Late-render / focus-follow closure

- History-open checkpoints: immediate + 100ms + 300ms + 1000ms + 2000ms，独立于 focus follow preference。
- Live/turn-settle checkpoints: 受 focus follow、`autoScrollRef` 与 bounded deadline guard 约束。
- Cancel contract: focus-off、manual scroll-away、top navigation、thread switch 同时清理 timer 与 RAF。
- Final typecheck、changed-file ESLint、`git diff --check` 与 OpenSpec strict validation 均通过。

### Render-loop hardening

- Root cause risk: stable checkpoints previously assigned the same `scrollTop` repeatedly, allowing `scroll -> anchor state -> timeline measure -> scroll intent` feedback under real WebView timing.
- Stable edge now produces zero DOM writes; duplicate same-intent requests are coalesced only while already at the requested edge. Geometry growth still triggers an immediate new run.
- Messages/helper focused tests: 54 passed.
- Expanded messages/AppShell/router tests: 80 passed, 5 skipped; standalone AppShell/router startup tests: 13 passed.
- Typecheck、changed-file ESLint 与 `git diff --check` passed.

### Active-first / 2s final calibration follow-up

- active-first history placement 不再等待 working/thinking 结束；scope 首次落位后，用户 scroll-away 在 settle 阶段保持有效。
- Automatic bottom intents 保留 immediate feedback，并追加 2000ms final checkpoint；history/settle lifecycle window 使用 2400ms，避免 timer jitter 提前击穿 guard。
- Checkpoint regressions 使用 controlled timers，覆盖 2s late growth、focus-follow cancel 与 active-first settle scroll-away。
- Helper / Messages / ScrollControl focused Vitest: 3 files passed, 61 tests passed。
- Codex / Claude shared surface、history loading、AppShell startup、router expanded Vitest: 8 files passed, 84 tests passed。
- `npm run typecheck`、changed-file ESLint、`git diff --check`: passed。
- `npm run check:large-files`: report mode completed；列出的 5 个既有超限文件均不属于本变更。
- `openspec validate --all --strict --no-interactive`: 404 passed, 0 failed。

### Same-thread reopen / multi-turn settlement follow-up

- Persistent canvas lifecycle: scope transition now clears one-time history placement, covering `thread A -> null -> thread A` without requiring component remount or history loading。
- Settlement ordering: `isThinking: true -> false` is captured in layout phase so back-fill geometry cannot preempt the unified bottom request。
- Lightweight parity: oversized automatic lightweight presentation reopens at true bottom while retaining its render-budget UI and hydration policy。
- Focused reopen/settle/virtualization Vitest: 3 files passed, 62 tests passed, 5 skipped。
- Expanded Codex/Claude/history/lightweight/AppShell/router Vitest: 9 files passed, 91 tests passed, 5 skipped。
- `npm run typecheck`、changed-file ESLint、`git diff --check`: passed。
- `npm run check:large-files`: report mode completed；列出的 5 个既有超限文件均不属于本变更。
- `openspec validate --all --strict --no-interactive`: 404 passed, 0 failed。

### 非本变更 blocker

- Full `npm run test` 在 `src/features/app/components/Sidebar.test.tsx` 稳定出现 3 个既有断言失败；单文件复跑结果一致（44 passed, 3 failed）。失败集中于 bottom action order 与 `menuitem` / `menuitemradio` role contract，不涉及 messages scroll 代码。
- Large-file report 仍列出仓库已有文件；本变更新增 helper 与 tests 未进入违规清单。

### 人工验收

- Vite dev server 已启动：`http://127.0.0.1:1420/`。
- 待人工验证 history-open、turn-settle、manual scroll-away、floating top/bottom control。

# 2026-07-09 至 2026-07-15 代码变更 OpenSpec 覆盖审计

## 结论

- Audit range: `2026-07-09 00:00:00 +08:00` 至 `2026-07-15` 当前 HEAD。
- Git commits: 149 total、107 non-merge、64 touching code/build paths。
- Coverage classification: 22 direct change tracked、12 existing proposal tracked、18 retrospective backfill、12 non-behavior maintenance。
- Backfill owner: `retro-weekly-code-change-spec-coverage-2026-07-15`。
- 判定单位是 behavior group；同一 capability 的 feature/fix commits 合并跟踪，但下表覆盖全部 64 个 commit。

## 判定规则

| 分类 | 判断依据 |
|---|---|
| Direct change tracked | commit 同时写入对应 active/archive change artifacts，或更新已存在 change 的 tasks/verification |
| Existing proposal tracked | commit 未写 OpenSpec，但行为明确落在同期 active/archive proposal 的目标、影响面或 acceptance 内 |
| Retrospective backfill | 没有 proposal 证据，或只直接修改 main spec 而缺少 change lifecycle |
| Non-behavior maintenance | pure refactor、style-only polish、version bump、dependency/lock/build hygiene，不新增 behavior contract |

## Direct Change Tracked (22)

| Commit | Change / capability evidence |
|---|---|
| `21bdde7a7f` | archived `fix-radix-select-popup-webview-zoom` |
| `54b0c1004f` | active `align-codex-message-rendering-with-official` |
| `3369ff28b3` | active `harden-message-compact-display-math-boundaries` |
| `749dd0300c` | active `fix-message-math-container-prefix` |
| `a0f070bb99` | active `unify-conversation-scroll-bottom-convergence` |
| `cb0287406f` | active `unify-conversation-scroll-bottom-convergence` |
| `8b8b919b12` | active `restore-added-file-diff-access` |
| `0c198dc7f8` | active `fix-app-shell-composer-startup-convergence` |
| `2885187326` | active `fix-sidebar-scroll-area-react19-ref-loop` |
| `b27891b0c3` | active `fix-messages-scroll-anchor-update-loop` |
| `27c501a7a8` | active `add-downloadable-web-assets` |
| `1173ae679a` | active `fix-sidebar-thread-row-provider-startup-loop` task follow-up |
| `db663a4427` | active `fix-sidebar-thread-row-provider-startup-loop` |
| `0d2c5caded` | active `fix-tooltip-startup-update-loop` |
| `2577fd6fe3` | active `group-global-search-results` |
| `a463a259d5` | active `harden-conversation-rendering-for-large-history` task follow-up |
| `be0aa7a2aa` | active `2026-06-24-retire-opencode-and-gemini-cli` task follow-up |
| `d12be2fa44` | active `reduce-idle-chrome-render-cost` |
| `342f032c17` | active `reduce-idle-chrome-render-cost` equivalent branch commit |
| `c8eb17ba1e` | archived note-card workbench changes plus synced `workspace-note-card-pool` |
| `3747880f01` | `refactor-note-cards-center-workbench` change artifacts |
| `942776b3c0` | `add-idea-style-editable-workspace-diff` change artifacts |

## Existing Proposal Tracked (12)

| Commit | Existing proposal evidence |
|---|---|
| `267165aa6a` | `redesign-workspace-sidebar-session-loading` covers staged hydration/loading-state semantics |
| `63b2403523` | `reduce-idle-chrome-render-cost` covers behavior-preserving idle render optimization companion work |
| `dee11b3089` | same behavior-preserving performance companion work on equivalent branch history |
| `f0b5fe7873` | `add-downloadable-web-assets` defines web asset dedup/package separation and daemon asset source |
| `57e503c873` | existing Codex plan/message rendering contracts cover identity-stable exit-plan dedupe |
| `1b44bed26f` | `fix-codex-thread-start-continuity-and-recovery` covers pending native binding and delete/recovery races |
| `ddf3c18706` | `add-askuserquestion-default-mode-mcp-bridge` covers request ownership and answer round-trip |
| `9c983108df` | `add-askuserquestion-default-mode-mcp-bridge` covers authenticated in-process MCP reachability |
| `38d6ac6b90` | same AskUserQuestion change; warning cleanup is implementation maintenance inside tracked surface |
| `003a96299c` | Codex start continuity plus archived live assistant text channel contracts |
| `4271504933` | archived `fix-live-bottom-follow-scroll-control` |
| `7af1ff2cc8` | active `add-linux-native-menu-localization` |

## Retrospective Backfill (18)

| Behavior group | Commits | Capability |
|---|---|---|
| 10-language catalog and localization pipeline | `8dae29d8d5`, `9eec97f0df` | `client-localization-language-support` |
| Terminal selection/file path handoff without duplication | `213a717061`, `c3de436705` | `terminal-composer-handoff` |
| Shared scrollbar geometry and Terminal theme fallback | `502f15e886`, `0ad7270c35`, `f739303bb5` | `client-scrollbar-visual-consistency` |
| Turn-level file-change summary and pending pin | `aad94c1a96`, `6a649be363` | `conversation-file-change-surface-parity` |
| Commit generation last-config quick reuse | `5c69acb66b` | `git-commit-message-generation` |
| Session title and slash-command argument fidelity | `f83a47a9cf`, `96608527a4` | `session-history-display-fidelity` |
| Last selected Codex provider for one-click create | `8aba42970d` | `codex-provider-scoped-session-launch` |
| Codex 5.6 built-in model family | `94de14e66e` | `codex-model-catalog-coverage` |
| Generic tool marker alignment | `363fd5ece1` | `message-tool-marker-shell` |
| Git Hub selection and nested repository file opening | `a0706b048e`, `2077202511` | `git-panel-diff-view` |
| Codex health-check recovery window | `cf17256ea3` | `codex-conversation-liveness` |

`2077202511` 曾直接修改 main spec，但没有 change proposal，因此仍判定为 retrospective backfill，而不是 direct proposal tracking。

## Non-Behavior Maintenance (12)

| Commits | Reason |
|---|---|
| `d4a2ae2948` | i18n namespace file split；behavior 由 localization backfill 覆盖，refactor 本身不新增 requirement |
| `2d65fce080`, `d0557ba365`, `eafe049f15`, `390b5222b2`, `f9ade56041` | automated/manual version bumps |
| `384b7b0517`, `e23c9f8dfa` | explicit dependency and lockfile synchronization；没有新增 product behavior |
| `d47800e88b`, `5a37a4922d` | token/padding visual polish，不改变 workflow 或 state contract |
| `2a3f81be47` | stale comment cleanup |
| `6ac45e0e3c` | app-shell extraction with regression tests；public behavior preserved |

## Active Change Closure Audit

归档资格规则：`tasks.md` 至少包含一个 `- [x]`，且不存在 `- [ ]`。以下 13 个 active changes 满足条件，必须先 sync main specs 再归档：

- `add-downloadable-web-assets`
- `align-codex-message-rendering-with-official`
- `fix-app-shell-composer-startup-convergence`
- `fix-message-math-container-prefix`
- `fix-messages-scroll-anchor-update-loop`
- `fix-sidebar-scroll-area-react19-ref-loop`
- `fix-sidebar-thread-row-provider-startup-loop`
- `fix-tooltip-startup-update-loop`
- `group-global-search-results`
- `harden-message-compact-display-math-boundaries`
- `reduce-idle-chrome-render-cost`
- `restore-added-file-diff-access`
- `unify-conversation-scroll-bottom-convergence`

包含未完成 tasks 的 changes 保持 active，即使 OpenSpec artifact status 为 complete。

## Validation Baseline

- Pre-change inventory: 25 active changes、582 archives、384 main specs。
- Consistency baseline: 1590 checks、1206 success、384 legacy title-format warnings、0 errors。
- Post-sync consistency: 1610 checks、1215 success、395 legacy title-format warnings、0 errors。该 checker 对每个 main spec 固定产生一个 title warning，因此 warning density 保持 `1/spec`；本轮不改写全量历史标题。

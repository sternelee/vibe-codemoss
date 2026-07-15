## Why

2026-07-09 至 2026-07-15 的 64 个非 merge 代码/构建提交中，部分行为变更没有在落地时关联 OpenSpec proposal。若只保留 Git subject，后续无法区分既有 contract、真正的行为新增与纯 implementation maintenance，也无法可靠维护 `openspec/project.md` 的 active/archive 快照。

## 目标与边界

- 建立 commit -> behavior group -> capability -> OpenSpec 状态的可审计映射。
- 对没有既有 proposal 或 main spec contract 的用户可见行为补录 retrospective requirements。
- 将 pure refactor、dependency lock、version bump、release packaging maintenance 明确分类为无需独立 behavior proposal，而不是伪造产品需求。
- 本 change 只补文档事实，不修改或重新解释已经发布的代码实现。

## 非目标

- 不修改 `src/**`、`src-tauri/**`、build scripts、dependencies 或 runtime configuration。
- 不把每个 commit 强制转换成独立 capability；同一用户行为的连续 fix 合并为一个 contract。
- 不替代仍在进行中的 active changes，也不把存在未完成任务的 change 提前归档。
- 不修复历史 OpenSpec formatter 的全局 warning。

## What Changes

- 补录 multilingual catalog/localization pipeline、Terminal-to-Composer handoff、session history display fidelity、Codex built-in model catalog coverage、client scrollbar visual consistency 五个 capability。
- 扩展 conversation file-change card、AI commit config reuse、Codex provider selection persistence、generic tool marker、Git Hub file selection、Codex liveness timeout 六个既有 capability 的边界场景。
- 生成一周代码变更覆盖审计报告，记录直接覆盖、间接覆盖、补录和无需 behavior proposal 四类判定。
- 同步 main specs 后立即归档本 retrospective change；已完成且 tasks 全部勾选的 active changes 按相同 gate 同步归档。

## 方案对比与取舍

- **方案 A：每个缺口 commit 一个 proposal。** 可追踪粒度最高，但会把连续 feature/fix 拆成大量重复 capability，制造 archive 噪音；拒绝。
- **方案 B：按一周审计批次建立一个 retrospective change，并按 capability 写 delta。** 保留 commit 证据，同时让 main spec 仍以行为边界组织；采用。
- **方案 C：只更新 `project.md`，不补 specs。** 能刷新数字但不能形成可执行 contract；拒绝。

## Capabilities

### New Capabilities

- `client-localization-language-support`: 10-language catalog、fallback 与 localization pipeline 的稳定 contract。
- `terminal-composer-handoff`: Terminal selection/file path 到 Composer 的单次、无重复 handoff contract。
- `session-history-display-fidelity`: session title、command prompt 与参数在 sidebar/history 中的展示保真。
- `codex-model-catalog-coverage`: built-in Codex model families 在 selector/catalog 中的一致覆盖。
- `client-scrollbar-visual-consistency`: shared scroll containers 与 Terminal scrollbar 的 geometry/theme contract。

### Modified Capabilities

- `conversation-file-change-surface-parity`: 增加 turn-level summary card 与 pending turn pinning。
- `git-commit-message-generation`: 增加 last-used generation config 的 quick reuse。
- `codex-provider-scoped-session-launch`: 增加 one-click creation 对最近 provider 的记忆与 fallback。
- `message-tool-marker-shell`: 增加 generic tool marker 与 sibling rows 的 visual semantics 一致性。
- `git-panel-diff-view`: 增加 Hub 文件列表选择态与 section action 一致性。
- `codex-conversation-liveness`: 增加 health-check timeout 不得短于可恢复启动窗口的约束。

## Impact

- Documentation only: `openspec/changes/**`、`openspec/specs/**`、`openspec/docs/**`、`openspec/project.md`。
- Trace evidence: commits `8dae29d8d5`、`9eec97f0df`、`213a717061`、`c3de436705`、`aad94c1a96`、`6a649be363`、`5c69acb66b`、`f83a47a9cf`、`96608527a4`、`8aba42970d`、`94de14e66e`、`502f15e886`、`f739303bb5`、`0ad7270c35`、`363fd5ece1`、`a0706b048e`、`2077202511`、`cf17256ea3`。
- No API、storage schema、dependency 或 runtime behavior change。

## 验收标准

- 审计报告覆盖本时间窗全部 64 个 non-merge code/build commits，且每个行为组有唯一分类。
- 11 个 capability delta 通过 strict validation 并同步到 main specs。
- 只归档 tasks 全部完成的 active changes；任何包含 `- [ ]` 的 change 保持 active。
- `openspec/project.md` 的 active/archive/spec counts 与文件系统事实一致。
- `openspec validate --all --strict --no-interactive` 为 0 failures，`git diff --check` 通过。

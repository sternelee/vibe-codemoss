# Proposal: Investigate Parallel Conversation Jank 2026-06

## Why

用户报告「客户端在多 session 并行对话时,运行时间越长越卡顿」(待复现矩阵:同时开 3+ workspace,每个 workspace 跑 2+ long-running turn,持续 15 分钟以上)。本 change 不在沙盒内改产品代码,而是**把诊断、定位、修复方案沉淀成可执行文档**,让接手的人照着做就能复现 + 定位 + 修。

仓库最近 6 个月密集做了 P1 性能提案(`c27bb18a`、`7cc4a284`、`25d101a0`、`a8bd4b24` 等),`openspec/specs/conversation-realtime-cpu-stability` 和 `conversation-realtime-client-performance` 已经定义了一组完整的 runtime 性能契约,问题不是这些契约不对,而是**多个保护层同时退化时叠加的复合症状**,需要一份跨层(进程、事件总线、reducer、渲染、侧栏、计时器)的诊断 + 修复手册。

根因清单(详见 `design.md`):

1. **Rust 端 child 进程释放缺少 Drop 兜底**:`ClaudeSession.active_processes: Mutex<HashMap<turn_id, Child>>` 在正常完成、setup failure、`interrupt()` 等路径会移除/终止,但 `ClaudeSession` 没有 `impl Drop`;若最后一个 `Arc<ClaudeSession>` 被释放时仍有 child 句柄,没有同步兜底 kill。OpenCode/Gemini 也有同类 `active_processes` 结构,后续实现需要一起审计。
2. **运行时优化开关可退化且缺少自检/重置入口**:`ccgui.perf.*` 8 个开关(`realtimeBatching` / `appServerEventBatch` / `reducerNoopGuard` / `incrementalDerivation` / `backgroundRenderGating` / `backgroundBufferedFlush` / `stagedHydration` / `debugLightPath`)从 `localStorage` 读;非 test 模式会缓存,其中 reducer / derivation 还在模块加载时固化。任意开关被关掉都会放大对应症状,但当前没有统一 `getActiveFlags()` 或 Settings reset 入口。
3. **`Markdown` progressive reveal 仍有边界扫描成本**:`LiveMarkdown` 已有 small-pending short-circuit 与 visible/pending adaptive cadence,但 `PROGRESSIVE_REVEAL_STEP_MS = 28ms` 仍是基础节奏,`findProgressiveRevealBoundary` 仍用 6 个正则顺序扫描。长 turn 下需要实测 p95 与 render cadence,再决定是否改为单次扫描/更保守 cadence。
4. **`handlers` 巨型 useMemo**:`useThreadEventHandlers` 末尾的 `handlers` useMemo 包含 28 个内部 callback,任一 callback 的 deps 改变就让 handlers 引用变。
5. **Home / recent conversation list 未虚拟化,thread status 投影仍有全量路径**:`src/features/home/components/HomeChat.tsx` 对 recent runs 直接 `.map`,`useThreads.ts` 中 `backgroundActivityByThread` 仍从 `threadStatusById` 全量投影。需要把“侧栏/首页 recent list/active session list”逐一量测,避免把未虚拟化问题误归到错误组件。
6. **`mediaResourceOwners` 资源释放通道只覆盖 `URL.createObjectURL`;`LocalImage` 当前用 `resolvedSrc` + `readLocalImageDataUrl` fallback,没有 IntersectionObserver / session-switch release**,长会话图片 decode / data URL / asset URL 资源可能不被及时释放。
7. **`useThreads` 中 timer 注册分散**:`lazyResumeTimerByWorkspaceRef` 已按 workspace 去重并在 unmount 清理;`sharedSessionSyncTimerByThreadRef` 仍按 thread 维度调度,另有 refresh/reconnect/debug timer 分散在多个 hook。风险应表述为“缺统一 diagnostics 和 idle scheduling”,不是所有 timer 都无清理。

## What Changes

- 在 `openspec/changes/investigate-parallel-conversation-jank-2026-06/` 下落 `proposal.md` / `design.md` / `tasks.md` / `specs/parallel-conversation-runtime-residuals/spec.md`,把上面 7 条根因的诊断方法、修复方案、验收口径、回归测试写成可执行文档。
- 在 `docs/perf/` 落运行时诊断入口文档(不是产品代码改动,而是说明在哪里、怎么查),作为 ops/QA 团队排查手册。
- 在 `.trellis/spec/frontend/` 落一条 `parallel-conversation-runtime-residuals.md` guide,描述「多 session 并行卡顿」的诊断 checklist 与修复项,作为 code-level rule 沉淀。
- **本次沙盒内不做任何 `src/**` / `src-tauri/**` 代码改动**(跟 `close-client-performance-residual-2026-06` 一致,本 change 是"诊断 + 修复方案 + 验收口径"沉淀)。

## Capabilities

### New Capabilities

- `parallel-conversation-runtime-residuals`:定义 7 条根因对应的诊断信号、修复方法、回归证据契约。

## Impact

- Affected specs:新增 `parallel-conversation-runtime-residuals` spec,定义 7 条根因对应的 diagnostics / follow-up repair contract。
- Affected code:本 change 沙盒内**不**改产品代码;实际修复在后续 `fix-parallel-conversation-runtime-residuals-2026-06` 提案中执行(由本 change 的 tasks.md §8 显式指明)。
- Affected tests:新增 1 个 spec 文件(契约层),无产品代码测试改动。
- Documentation:`.trellis/spec/frontend/parallel-conversation-runtime-residuals.md`(guide) + `openspec/changes/investigate-parallel-conversation-jank-2026-06/**`(本 change 文档)。

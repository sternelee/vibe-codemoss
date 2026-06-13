# Tasks: Investigate Parallel Conversation Jank 2026-06

> 本 change 的完成口径是「调查方案、代码事实校准、诊断手册、spec delta、复现脚本」落地并通过 OpenSpec validation。所有 `src/**` / `src-tauri/**` 产品代码修复、诊断 command、Settings UI、单元测试新增均属于后续 `fix-parallel-conversation-runtime-residuals-2026-06` change。

## 1. Preflight

- [ ] 1.1 [P0][depends:none][input:用户复现描述][output:`docs/perf/jank-reproduction-checklist.md`,记录复现步骤][validation:文档涵盖 5+ workspace、3+ session/workspace、15+ 分钟运行时长] Document reproduction steps.
- [ ] 1.2 [P0][depends:none][input:`pgrep -f claude | wc -l` 在 0/5/10/15/30 分钟采样][output:基线 child 进程数 + 增长曲线][validation:在 5+ workspace 活跃下 child 数 ≥ workspace × 2 且单调增长] Establish baseline child process count.
- [ ] 1.3 [P0][depends:none][input:DevTools console 跑 `Object.keys(localStorage).filter(k => k.startsWith('ccgui.perf.'))`][output:`docs/perf/jank-flag-state.md`,记录 8 个开关的实际值与默认值的偏差][validation:文档列出 8 个开关 + 实际值 + 偏差分析] Establish baseline perf flag state.
- [ ] 1.4 [P0][depends:none][input:DevTools Performance 录制 30s 长 turn + Memory snapshot 在 0/5/15/30 分钟采][output:`docs/perf/jank-perf-baseline.md`,记录 frame time 分布 / heap 增长 / longtask 数量][validation:文档含主线程 frame time p50/p95、heap 增长斜率、longtask > 50ms 计数] Establish perf baseline snapshot.

## 2. Root Cause 1: Rust Child Process Accumulation

- [ ] 2.1 [P0][depends:1.2][input:`src-tauri/src/engine/claude.rs` / `opencode.rs` / `gemini.rs` 的 `active_processes`][output:`docs/perf/jank-child-process-report.md`,记录 insert/remove/interrupt/drop 现有路径和缺口][validation:报告明确区分"已有清理路径"与"缺 Drop 兜底"] Audit child process lifecycle paths.
- [ ] 2.2 [P0][depends:1.2][input:`src-tauri/src/engine/claude.rs:673` `active_process_ids` + `claude_forwarder.rs` internal usage][output:`docs/perf/jank-child-process-report.md`,记录现有 API 与缺少的 DevTools 汇总 command][validation:报告说明后续 command 应汇总哪些 workspace/engine 字段] Design diagnostic command shape.
- [ ] 2.3 [P1][depends:2.1][input:用户操作 5+ workspace 跑 30 分钟][output:`docs/perf/jank-child-process-report.md`,记录 active child 数随时间的曲线 + 哪些 workspace 的 child 未被回收][validation:报告附图表(plain ASCII 即可),若数据不足则明确标为 unconfirmed] Confirm root cause via data.

> **修复(在后续 `fix-parallel-conversation-runtime-residuals-2026-06` 提案中执行)**
>
> - 2.R1 [P0][depends:2.3] 给 `ClaudeSession` 加 `impl Drop`,在 drop 时遍历 `active_processes` 并对每个 `Child` 调 `start_kill()`(同步,SIGTERM)。 [validation:单元测试:spawn mock child → drop session → 1s 内 child.try_wait() 返回 Some]
> - 2.R2 [P1][depends:2.R1] 加后台 reconciler,每 60s 扫一次 `active_processes`,对超过 5 分钟无 IO 的 child 主动 kill + emit `turn/stalled`。 [validation:集成测试:mock 6 分钟无 IO → reconciler 触发 kill]
> - 2.R3 [P1][depends:2.R1] `ClaudeSessionManager.sessions` 加 weak reference 跟踪,Arc 引用清零时回收。 [validation:单元测试:创建 session → drop Arc → sessions.remove 被调用]

## 3. Root Cause 2: Performance Flag Degradation

- [ ] 3.1 [P0][depends:1.3][input:`src/features/threads/utils/realtimePerfFlags.ts:1-104` `readRealtimePerfFlag`][output:`docs/perf/jank-flag-state.md`,记录 8 个开关 production/test default、cache 行为、模块顶层固化点][validation:文档列出 `useThreadsReducer.ts` 与 `threadReducerCoreHelpers.ts` 两个顶层读点] Document default values and cache behavior.
- [ ] 3.2 [P0][depends:1.3][input:DevTools console][output:`docs/perf/jank-flag-reset-recipe.md`,记录"清空 + reload"的命令序列与预期效果][validation:文档含 `localStorage.removeItem` 列表 + 截图示意] Document reset recipe.
- [ ] 3.3 [P1][depends:3.1][input:`src/features/threads/utils/realtimePerfFlags.test.ts` 现有 override tests][output:`docs/perf/jank-flag-state.md`,记录已有测试覆盖与后续缺口][validation:文档说明新增 `getActiveFlags()` / reset UI 测试属于 follow-up] Map existing test coverage.

> **修复(在后续提案中执行)**
>
> - 3.R1 [P0][depends:3.3] 给 `realtimePerfFlags.ts` 加 `getActiveFlags(): Record<string, boolean>` debug 入口(导出),DevTools 可调。 [validation:DevTools console `import('/src/features/threads/utils/realtimePerfFlags.ts').then(m => console.log(m.getActiveFlags()))` 返回 8 个 key-value]
> - 3.R2 [P1][depends:3.R1] Settings 面板加 "Reset performance flags" 按钮(改 localStorage + 提示 reload)。 [validation:e2e 测试:点按钮 → localStorage 8 个 key 全删 → 提示 reload 弹窗出现]
> - 3.R3 [P1][depends:3.R1] `useThreadsReducer.ts:101-102` 的模块顶层 `REDUCER_NOOP_GUARD_ENABLED = isReducerNoopGuardEnabled()` 改成运行时 lazy read(用 getter 或 useSyncExternalStore),避免 module 加载时锁死。 [validation:单元测试:localStorage 改值 + 不 reload → 行为立即反映(需要测试 setup 支持 hot reload)]

## 4. Root Cause 3: 28ms Progressive Reveal

- [ ] 4.1 [P0][depends:1.4][input:`src/features/messages/components/LiveMarkdown.tsx:338-467` `findProgressiveRevealBoundary` / adaptive cadence][output:`docs/perf/jank-markdown-rerender.md`,记录 1000/3000/8000 字符输入耗时 + 当前 small-pending/adaptive cadence 事实][validation:报告不能声称 pending<140 未短路,必须记录现有 short-circuit] Benchmark boundary finder and current safeguards.
- [ ] 4.2 [P1][depends:4.1][input:DevTools React Profiler 录制 30s 长 turn][output:`docs/perf/jank-markdown-rerender.md`,记录 Markdown 组件每秒重渲染次数 + render duration 中位数][validation:报告含次数 + 时长分布] Profile Markdown component.
- [ ] 4.3 [P0][depends:4.2][input:`src/features/messages/components/Messages.tsx`(调用 Markdown 处)][output:`docs/perf/jank-markdown-prop-flow.md`,记录 throttledValue → progressiveValue → content → Markdown 重渲染的 prop chain][validation:文档含 prop chain 图 + 每跳的引用变化原因] Map prop chain.

> **修复(在后续提案中执行)**
>
> - 4.R1 [P0][depends:4.3] `findProgressiveRevealBoundary` 把 6 个正则合并成单次 `lastIndex` 扫描,或改用 `Intl.Segmenter`。 [validation:单元测试:8000 字符输入下耗时 ≤ 1ms(从 ≤ 3ms 降)]
> - 4.R2 [P0][depends:4.3] `resolveProgressiveRevealValue` 加 `useMemo` 包装,deps = `[visibleValue, targetValue, preferredChunkChars]`。 [validation:单元测试:同一组 props 调用 1000 次,实际计算次数 = 1]
> - 4.R3 [P1][depends:4.3] 保留 pending < 140 既有 short-circuit;若实测仍超标,将 visible ≥ 3000 的 adaptive cadence 从约 42ms 提升到 56ms,并补充 regression。 [validation:单元测试:pending=100 → resolveProgressiveRevealValue 直接返回 targetValue(无 boundary 扫描)]
> - 4.R4 [P2][depends:4.R3] `Markdown` 组件的 5 个 useState + 9 个 useEffect 拆出子组件,避免 throttledValue 变化跑全 effect chain。 [validation:React DevTools Profiler:throttledValue 变化时,只有相关子组件重渲染]

## 5. Root Cause 4: handlers Mega useMemo

- [ ] 5.1 [P0][depends:1.4][input:`src/features/threads/hooks/useThreadEventHandlers.ts:2651-2736` `handlers = useMemo(...)`][output:在 useMemo 入口打 `console.count('handlers-memo-rebuild')`,跑 30s 长 turn][validation:`docs/perf/jank-handlers-rebuild.md` 记录 rebuild 次数,期望 ≥ 20(证明问题)] Measure rebuild frequency.
- [ ] 5.2 [P1][depends:5.1][input:用 `why-did-you-render` 库临时接入][output:`docs/perf/jank-handlers-wdyr.md`,记录哪些子 callback 引起 handlers 引用变化][validation:报告含 28 个 callback 中引起变化的前 5 名 + 其 deps 链] Map cause chain.

> **修复(在后续提案中执行)**
>
> - 5.R1 [P0][depends:5.2] `handlers` useMemo 拆成 3 组(`streamingHandlers` / `lifecycleHandlers` / `diagnosticHandlers`),每组独立 useMemo,deps 收紧。 [validation:单元测试:30s 长 turn → 每组 rebuild 次数 ≤ 5]
> - 5.R2 [P1][depends:5.R1] 顶层 `flushPendingRealtimeEvents` / `markRealtimeTurnTerminal` / `emitTurnDomainEvent` / `finalizeTurnDiagnostic` / `quarantineCodexTurn` 等"基础设施" callback 用 `useEvent` / 自定义 `useStableCallback` 包装,引用永久稳定。 [validation:单元测试:同一组 deps 下 callback 引用 100 次访问恒等]
> - 5.R3 [P2][depends:5.R1] 用 `useReducer` 模式取代部分 useCallback 链:把状态相关的 dispatcher 集中,只暴露一个稳定的 dispatch。 [validation:单元测试:dispatch 引用 100 次访问恒等]

## 6. Root Cause 5: Sidebar Not Virtualized

- [ ] 6.1 [P0][depends:1.4][input:`rg "useVirtualizer" src/features/home/` + `HomeChat.latestAgentRuns` + actual thread sidebar consumer][output:确认哪些 list 未虚拟化][validation:报告明确区分 Home recent list、workspace picker、thread sidebar consumer] Confirm list surfaces lacking virtualization.
- [ ] 6.2 [P0][depends:1.4][input:`src/features/threads/hooks/useThreads.ts:2243` `Object.fromEntries(...)`][output:打 `console.time('backgroundActivityByThread')`,跑 workspace 切换 5 次][validation:`docs/perf/jank-sidebar-rebuild.md` 记录耗时,期望 ≥ 50ms(证明问题)] Measure rebuild cost.
- [ ] 6.3 [P1][depends:6.1][input:`@tanstack/react-virtual` 已在 `git-history` / `files` / `git diff viewer` / `MessagesTimeline` 使用][output:`docs/perf/jank-sidebar-virtualization-plan.md`,描述给实测超长 list surface 引入 useVirtualizer 的方案][validation:文档含 viewport 估算、item 高度、overscan 参数、fallback 策略] Plan virtualization.

> **修复(在后续提案中执行)**
>
> - 6.R1 [P0][depends:6.3] 对实测超长 list surface 引入 `@tanstack/react-virtual` 的 `useVirtualizer`,按 viewport 高度虚拟化,overscan=5。 [validation:单元测试:mock 200 item → DOM 中只渲染 ≤ 20 个 item]
> - 6.R2 [P1][depends:6.R1] `backgroundActivityByThread` 改成懒计算:只在 sidebar item 进入视口时计算,加 `Map<threadId, projection>` LRU cache(limit 200)。 [validation:单元测试:100+ session 切到列表 → 首次 active 计算 ≤ 20]
> - 6.R3 [P2][depends:6.R1] `threadsByWorkspace` 在 reducer 里用 structural sharing(immer 或手写),只重建变化的 workspace。 [validation:单元测试:1 个 workspace 的 thread 变化 → 其他 workspace 引用恒等]

## 7. Root Cause 6: convertFileSrc Resource Leak

- [ ] 7.1 [P0][depends:1.4][input:DevTools Memory heap snapshot 在 0/5/15/30 分钟各采一次][output:`docs/perf/jank-image-resource.md`,记录 `ImageBitmap` / `HTMLImageElement` detached 数 + heap 增长][validation:报告含 4 个时间点的 heap + ImageBitmap 数量] Measure image resource leak.
- [ ] 7.2 [P1][depends:7.1][input:`src/services/mediaResourceOwners.ts`(只管 `URL.createObjectURL`)][output:`docs/perf/jank-image-resource-gap.md`,对比 mediaResourceOwners 与 convertFileSrc 资源管理的覆盖范围][validation:文档明确 convertFileSrc 不在管理范围内,这就是 gap] Identify coverage gap.

> **修复(在后续提案中执行)**
>
> - 7.R1 [P0][depends:7.2] `LocalImage` 加 IntersectionObserver,图片滚出视口且超过 N 张时主动 `img.src = ''` 释放解码 bitmap,滚回视口时重载。 [validation:单元测试:mock 50 张图片 → visibility observer 触发后 detached ImageBitmap ≤ 10]
> - 7.R2 [P1][depends:7.R1] 后台 session 的图片整组 `src = ''`,切回时重新加载。 [validation:单元测试:切走 workspace → 30s 后图片 src 全部为空]
> - 7.R3 [P2][depends:7.R1] Tauri `convertFileSrc` 加 `?cacheBust=<turn_id>` 参数,让 WebView 不复用旧资源。 [validation:单元测试:turn_id 变化 → URL 中 cacheBust 参数变化]

## 8. Root Cause 7: setTimeout Accumulation

- [ ] 8.1 [P0][depends:1.4][input:DevTools Performance 录制 30s][output:`docs/perf/jank-timer-density.md`,记录 Timer/Fire 事件密度 + 队列 size][validation:报告含每 5s 间隔的 timer 数量] Measure timer density.
- [ ] 8.2 [P0][depends:8.1][input:`src/features/threads/hooks/useThreads.ts` 7+ 处 setTimeout][output:在每个 setTimeout 入口加 `console.count('setTimeout-fire')`,跑 5 workspace 并行 5 分钟][validation:`docs/perf/jank-timer-breakdown.md` 记录各类 timer 触发频次] Break down timer sources.

> **修复(在后续提案中执行)**
>
> - 8.R1 [P0][depends:8.2] 所有"非紧急" timer(lazyResume / sharedSessionSync / refresh)改用 `requestIdleCallback` 或 `scheduler.postTask`。 [validation:单元测试:空闲回调在 50ms 空闲窗口内执行]
> - 8.R2 [P1][depends:8.R1] lazyResume / sharedSessionSync 改成单例合并:每个 workspace 最多 1 个 timer,内部用 map 跟踪待办。 [validation:单元测试:5 workspace × 3 session 触发 lazy resume → timer 数量 = 5 而非 15]
> - 8.R3 [P1][depends:8.R1] 关键路径(heartbeat / reconnect)保留 setTimeout 但加 jitter(±20%)防 thundering herd。 [validation:单元测试:10 个并发 reconnect → 触发时间分布在 ±20% 区间]
> - 8.R4 [P2][depends:8.R1] 计时器引用统一管理在 `useRef<Map<string, Timeout>>` 里,组件 unmount / 依赖变化时统一 clear。 [validation:单元测试:组件 unmount → 所有 timer 引用被 clear]

## 9. Spec Delta & Validation

- [ ] 9.1 [P0][depends:1.1-8.2][input:本 change 7 条根因诊断结果][output:`openspec/changes/investigate-parallel-conversation-jank-2026-06/specs/parallel-conversation-runtime-residuals/spec.md`,含 1 个 ADDED Requirement + 6 个 Modified Requirements][validation:`rg "Requirement" spec.md` 命中 ≥ 7 个 Requirement] Write spec delta.
- [ ] 9.2 [P0][depends:9.1][input:本 change 沙盒内不动产品代码][output:`openspec/changes/fix-parallel-conversation-runtime-residuals-2026-06/`(在 archive 外)的提案骨架,占位 tasks 指向本 design.md][validation:`openspec validate investigate-parallel-conversation-jank-2026-06 --strict --no-interactive` 通过] Cross-link follow-up change.
- [ ] 9.3 [P1][depends:9.2][input:`openspec/specs/conversation-realtime-cpu-stability` + `realtime-event-batching-performance` + `app-server-event-batching`][output:`docs/perf/jank-related-specs.md`,列出 7 条根因对应的现有 spec,确认是否需要新增或修订][validation:报告含 7 条根因 → 现有 spec 的映射表] Map root causes to existing specs.

## 10. Frontend Trellis Guide

- [ ] 10.1 [P0][depends:9.1][input:本 design.md 7 条根因 + 修复方案][output:`.trellis/spec/frontend/parallel-conversation-runtime-residuals.md`,作为 code-level rule 沉淀][validation:文档含 7 条根因的诊断 checklist + 修复实施 SOP + 回归测试要求] Write Trellis guide.
- [ ] 10.2 [P1][depends:10.1][input:`scripts/perf-reproduce-jank.sh`][output:复现脚本落到 `scripts/perf-reproduce-jank.sh`,含 child 进程采样 + webview 内存监控步骤][validation:脚本可执行(`chmod +x` + syntax check)但不实际跑 Tauri] Write reproduce script.
- [ ] 10.3 [P1][depends:10.1][input:`package.json` 已有 `perf:*` 脚本][output:`docs/perf/jank-diagnosis-flow.md`,描述"复现 → 定位 → 修复 → 验证"完整流程][validation:文档含 4 阶段 checklist,每阶段可由不同人独立执行] Write diagnosis flow.

## 11. Final Validation

- [ ] 11.1 [P0][depends:9.1][input:所有 OpenSpec artifacts][output:`openspec validate investigate-parallel-conversation-jank-2026-06 --strict --no-interactive` 通过][validation:validate 退出 0] Run strict OpenSpec validation.
- [ ] 11.2 [P0][depends:11.1][input:`src/**` / `src-tauri/**`][output:`git diff --stat -- 'src/**' 'src-tauri/**'` 为空][validation:无产品代码改动] Confirm no product code change.
- [ ] 11.3 [P1][depends:10.2][input:`scripts/perf-reproduce-jank.sh`][output:`bash -n scripts/perf-reproduce-jank.sh` 通过(syntax check,不实际跑)][validation:无 syntax error] Syntax check reproduce script.
- [ ] 11.4 [P1][depends:9.1][input:`specs/parallel-conversation-runtime-residuals/spec.md`][output:`rg "SHALL|MUST" spec.md` 命中 ≥ 10(契约密度足够)][validation:契约密度 ≥ 10] Verify spec density.

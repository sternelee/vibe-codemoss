# Design: Investigate Parallel Conversation Jank 2026-06

OpenSpec change: `investigate-parallel-conversation-jank-2026-06`

## Context

`ccgui` 是 Tauri + React 桌面客户端,核心架构:Rust 后端为每个 workspace 启动一个 Claude/Codex 子进程,通过 `BatchedTauriEventSink` 聚合,经 `app-server-event-batch` 通道 40ms 一批推到前端,前端用 reducer + 实时 markdown 渲染。

「并行对话卡顿」= 多 workspace × 多 session × 多 turn 同时跑,15+ 分钟后客户端从流畅变成肉眼可见的卡。当前代码事实显示这更像**进程层、事件总线层、reducer 层、渲染层、列表层、媒体资源层、计时器层**多个 residual 风险叠加的症状。本 change 负责把风险假设校准为可复现、可量测、可移交的修复队列,不声称所有根因已经被实机验证。

最近 6 个月已落地的相关 P1 提案:

| Commit | 主题 |
|---|---|
| `c27bb18a` | `perf(realtime): 降低多会话实时对话CPU峰值并补齐稳定性边界` |
| `7cc4a284` | `feat(realtime): 收口事件批处理与文件 I/O 隔离` |
| `25d101a0` | `feat(perf): 收口实时输入与前端 prop 链稳定性阶段实现` |
| `a8bd4b24` | `feat(perf): 收口客户端性能残余证据` |
| `f7ae0a99` | `perf(runtime): 落地 P1 性能预算链路` |
| `c60479d2` | `fix(app-shell): prevent redundant re-renders in selected session hooks` |
| `96ba5b06` | `fix(renderer): 加固客户端渲染稳定性防线` |
| `18de443a` | `fix(app): 收口实时线程状态行级订阅` |
| `e1cd9db3` | `fix(messages): 收口 Claude 长流式渲染恢复` |
| `bb58e69c` | `feat(threads): 优化实时对话客户端性能` |

已落地的相关 spec:

- `openspec/specs/conversation-realtime-cpu-stability/spec.md`(reducer no-op guard / incremental derivation / message render dedup / radar incremental refresh)
- `openspec/specs/conversation-realtime-client-performance/spec.md`(3-engine performance budget / send-critical composer state / terminal turn fence)
- `openspec/specs/realtime-event-batching-performance/spec.md`(first-token 立即 flush / coalesce preserve order / terminal flush)
- `openspec/specs/app-server-event-batching/spec.md`(Rust 40ms batch + 终端事件立即 flush)

## 数据流总览(用于定位每条根因在哪一层)

```
[Claude/Codex 子进程]
  → ClaudeSession.active_processes: Mutex<HashMap<turn_id, Child>>   [Rust 端,根因 1]
  → BatchedEventState 40ms flush                                     [src-tauri/src/event_sink.rs:60]
  → app.emit("app-server-event-batch", Vec<AppServerEvent>)          [Rust 端]
  → appServerBatchHub (Tauri listen)                                 [src/services/events.ts:174]
  → useAppServerEvents → dispatchAppServerEventBatch                 [根因 2,根因 4]
  → handlers.onNormalizedRealtimeEvent / onAgentMessageDelta / ...   [src/features/threads/hooks/useThreadEventHandlers.ts:2686]
  → useThreadsReducer / threadReducerCoreHelpers                      [根因 2,根因 4]
  → React state.itemsByThread
  → MessagesTimeline (虚拟化) → Markdown (LiveMarkdown 渐进显示)    [根因 3]
  → HomeChat recent runs / thread status projection                  [根因 5]
  → LocalImage / mediaResourceOwners                                 [根因 6]
  → useThreads 多处 timer(主线程)                                    [根因 7]
```

## 7 条根因详细分析

### 根因 1:Rust 端 child 进程释放缺少 Drop 兜底

**症状假设**:打开 5+ workspace 同时跑 turn,几分钟后 `ps -ef | grep claude` 可能看到 claude-cli 子进程驻留,`pgrep -f claude | wc -l` 单调增长。该假设必须通过 tasks §1/§2 的采样报告确认。

**代码位置**:
- `src-tauri/src/engine/claude.rs:257` `active_processes: Mutex<HashMap<String, Child>>`(per turn child)
- `src-tauri/src/engine/claude.rs:1117` `active.insert(turn_id.to_string(), child)`(spawn 后入 map)
- `src-tauri/src/engine/claude.rs:1125` disposed startup path 会 `terminate_child_process`
- `src-tauri/src/engine/claude.rs:1477` / `1743` / `1815` 等路径会从 `active_processes` remove/drain 后 terminate
- `src-tauri/src/engine/claude/manager.rs:64` `pub async fn remove_session(&self, workspace_id: &str) -> Option<Arc<ClaudeSession>>`(`ClaudeSessionManager.sessions: HashMap` 只在外部显式调用时移除)
- `src-tauri/src/runtime/session_lifecycle.rs:109` `.remove_session(workspace_id)` + `session.mark_disposed()`(workspace stop 时调用)

**已校准根因**:`ClaudeSession` 没有 `impl Drop`。现有代码在正常完成、setup failure、disposed startup、interrupt、remove_session 等路径已有清理,所以不能表述为“只要不点中断 child 永远驻留”。真正缺口是:最后一个 `Arc<ClaudeSession>` drop 时若 `active_processes` 仍持有 `Child`,没有同步兜底 kill;Tokio `Child` 默认 `kill_on_drop = false`。同类风险还存在于 `src-tauri/src/engine/opencode.rs` 与 `src-tauri/src/engine/gemini.rs` 的 `active_processes` 结构,后续修复 change 应一起审计。

**诊断步骤**:
1. 在 Rust 端加临时打点:每隔 30s `log::info!("active claude children: {}", active_processes.lock().await.len())`。
2. 暴露汇总诊断命令(已有 `active_process_ids()` 在 `claude.rs:673`,且 `claude_forwarder.rs` 内部会调用,但没有面向 DevTools 的 workspace-level 汇总 command),在 DevTools console 调 `await window.__TAURI__.core.invoke('get_jank_diagnostics')` 或后续确定的 command。
3. 外部:`ps -ef | grep -c claude-cli` 或 `pgrep -f 'claude' | wc -l` 在 0/5/15/30 分钟各采一次,看是否单调。

**修复方案**(后续 `fix-parallel-conversation-runtime-residuals-2026-06` 提案执行):
- `ClaudeSession` 加 `Drop` 实现:在 drop 时尽量 `try_lock` 并对 child 调同步 kill 入口。注意 `terminate_child_process` 是 async,不能在 `Drop` 里直接 await;需要设计一个 non-blocking best-effort path(`start_kill` / platform kill helper)并记录无法拿锁时的 diagnostics。
- `ClaudeSession` 加后台 reconciler:每 60s 扫一次 `active_processes`,对超过 N 分钟无 IO 的 child 主动 kill 并 emit `turn/stalled`。
- `ClaudeSessionManager.sessions` 加 weak reference 跟踪,当 Arc 引用计数归零时强制回收。

**验收口径**:
- 关闭所有 workspace 30s 后,`pgrep -f claude | wc -l == 0`。
- 长跑 30 分钟后,active child 数 ≤ workspace 数 × 2(每个 workspace 最多 2 个并发 turn)。
- `claude-session-state.test.ts` 新增 case:模拟 session 引用清零后 5s 内 child 被 SIGTERM。

**回归测试**:
- Rust 单元测试:在 `ClaudeSession` 测试里 spawn 一个 mock child 进程,`drop(session)` 后 1s 内 `child.try_wait()` 返回 `Some(_)`。
- 集成测试:启动 3 个 mock workspace,关掉,5s 后断言无残留。

---

### 根因 2:运行时优化开关退化

**症状假设**:长跑时帧时间从 16ms 涨到 50ms+;`backgroundActivityByThread` 频繁重算;session 切换时整张表重投影。

**代码位置**:
- `src/features/threads/utils/realtimePerfFlags.ts:53` `cachedFlags: Record<string, boolean> = {}` 永久 cache
- `src/features/threads/utils/realtimePerfFlags.ts:69` `const stored = window.localStorage.getItem(...)` 从 localStorage 读
- 8 个开关:`realtimeBatching` / `appServerEventBatch` / `reducerNoopGuard` / `incrementalDerivation` / `backgroundRenderGating` / `backgroundBufferedFlush` / `stagedHydration` / `debugLightPath`
- `src/services/events.ts` 已有 `createEventBackpressure` substrate,部分 hub 在用;`appServerHub` / `appServerBatchHub` 当前没有专属 queue-depth/backpressure guard
- `src/features/threads/hooks/useThreadsReducer.ts:101-102` `const REDUCER_NOOP_GUARD_ENABLED = isReducerNoopGuardEnabled();`(模块加载时一次性读)
- `src/features/threads/hooks/threadReducerCoreHelpers.ts:6` `const INCREMENTAL_DERIVATION_ENABLED = isIncrementalDerivationEnabled();`(helper 模块也会一次性读)

**已校准根因**:`ccgui.perf.*` 8 个开关通过 `readRealtimePerfFlag` 从 localStorage 读取,非 test 模式会进入 `cachedFlags`。其中 reducer/no-op 与 incremental derivation 在模块顶层 const 再次固化,所以修改 localStorage 后通常需要 reload 才能恢复。任何 dev 工具、QA 工具、用户手动改过 localStorage,都会让某个开关变成 off,且**没有统一 UI/debug 入口重置**。

**诊断步骤**(DevTools console):
```js
// 1. 查当前实际生效值
Object.keys(localStorage).filter(k => k.startsWith('ccgui.perf.')).sort()

// 2. 查代码层默认值
// src/features/threads/utils/realtimePerfFlags.ts 末段所有 export 函数的 defaultValue 参数

// 3. 强制重置 + 验证(注意:不会清掉 cache,需要 reload)
['realtimeBatching','appServerEventBatch','reducerNoopGuard','incrementalDerivation',
 'backgroundRenderGating','backgroundBufferedFlush','stagedHydration','debugLightPath']
 .forEach(k => localStorage.removeItem('ccgui.perf.' + k));
location.reload();
```

**修复方案**:
- 给 `realtimePerfFlags.ts` 加 `getActiveFlags()` debug 入口,DevTools 里能调出来看当前值。
- 在 Settings 面板加 "Reset performance flags" 按钮(改 `localStorage` + 提示用户 reload)。
- `isAppServerEventBatchConsumerEnabled()` 当前是 `readRealtimePerfFlag("appServerEventBatch", true, false)`,注意第二个 true/false 是 `defaultValue / testDefaultValue` —— 生产应当是 true,test 是 false。当前实现是对的,但需文档化。
- **关键**:每个开关的 default value 必须在文件里有 `// Default: true, rationale: ...` 注释,避免后人改错。

**验收口径**:
- 所有 8 个开关的代码默认值为 `true`(生产),`false`(test)。
- 任意关掉一个,DevTools Performance 录制 30s 长 turn,reducer dispatch 次数 / Markdown 组件重渲染次数有可观测放大。
- 重新打开 + reload 后,放大消失。

**回归测试**:
- `src/features/threads/utils/realtimePerfFlags.test.ts` 已存在,需新增 case:模拟 localStorage 写入 `'ccgui.perf.realtimeBatching=0'`,断言 `isRealtimeBatchingEnabled() === false`,清掉后重置回 `true`。

---

### 根因 3:`Markdown` 组件 28ms progressive reveal

**症状**:长 turn 实时流式输出时,CPU 单核 80%+,`findProgressiveRevealBoundary` 频繁触发,DevTools Performance flame chart 看到 `Markdown` 组件反复重渲染。

**代码位置**:
- `src/features/messages/components/LiveMarkdown.tsx:3` `export const PROGRESSIVE_REVEAL_STEP_MS = 28;`
- `src/features/messages/components/LiveMarkdown.tsx:7` `const PROGRESSIVE_REVEAL_MAX_CHARS = 3_072;`
- `src/features/messages/components/LiveMarkdown.tsx:341-380` `findProgressiveRevealBoundary(pendingText, preferredChars, maxChars)` 6 个正则 `exec` 顺序扫描
- `src/features/messages/components/Markdown.tsx:1442` `export const Markdown = memo(function Markdown({...}))`
- `src/features/messages/components/Markdown.tsx:1585` `progressiveTimerRef.current = window.setTimeout(() => {...}, adaptiveStepMs)` 28ms 定时器
- `src/features/messages/components/Markdown.tsx:1487-1528` `useEffect` 监听 `throttledValue` 变化

**已校准根因**:`PROGRESSIVE_REVEAL_STEP_MS = 28ms` 是基础节奏,但当前 `resolveAdaptiveProgressiveRevealStepMs` 已在 visible ≥ 3000 或 pending ≥ 1200 时提升到约 42ms,visible ≥ 8000 或 pending ≥ 3000 时提升到 56ms;`resolveProgressiveRevealValue` 已对 pending ≤ 140 短路。剩余风险是 `findProgressiveRevealBoundary` 仍用 6 个正则顺序扫描切分,每帧 O(n) × 6,且 `Markdown` 内同一 `(visibleValue,targetValue,preferredChunkChars)` 没有显式 memo cache。

**诊断步骤**:
1. DevTools Performance 录制一段 30s 长流式 turn,看 Main thread 上 `findProgressiveRevealBoundary` 或 `resolveProgressiveRevealValue` 的 call count。
2. 在 `findProgressiveRevealBoundary` 入口打 `performance.mark` / `console.time`,看每次调用的耗时分布。
3. 用 React DevTools Profiler,看 `Markdown` 组件的 `render duration` 中位数,以及「不相关 prop 改变导致的 re-render」次数。

**修复方案**:
- `findProgressiveRevealBoundary` 把 6 个正则合并成单次 `lastIndex` 扫描(在 `pendingText` 上一次遍历,记录所有 boundary,取最优)。或者改用 `Intl.Segmenter` / 手写状态机。
- `resolveProgressiveRevealValue` 加 `useMemo` 包装,deps 收紧到 `[visibleValue, targetValue, preferredChunkChars]`。
- 先用 micro-benchmark 与 React Profiler 量测现有 adaptive cadence;若 p95 仍超标,再把 visible ≥ 3000 的 cadence从约 42ms 提升到 56ms,并保留 pending ≤ 140 的既有 short-circuit。
- `Markdown` 组件的 5 个 `useState` + 9 个 `useEffect` 拆出子组件,避免每次 `throttledValue` 变化都跑全 effect chain。

**验收口径**:
- 长 turn(8000+ 字符)流式期间,`Markdown` 组件的每秒重渲染次数 ≤ 18(对应 56ms 节奏)。
- `findProgressiveRevealBoundary` 1000 字符输入平均耗时 < 1ms。
- React DevTools Profiler:`Markdown` render duration 中位数 < 5ms。

**回归测试**:
- `src/features/messages/components/LiveMarkdown.test.tsx` 已有,新增 case:8000 字符输入下 `resolveProgressiveRevealValue` 单次调用 < 5ms。
- Playwright perf:多 session 并行长 turn 5 分钟,CPU 单核平均 < 60%。

---

### 根因 4:`handlers` 巨型 useMemo

**症状**:`useThreadEventHandlers` 末尾的 `handlers` 对象引用频繁变化;`useAppServerEvents` 的 `handlersRef.current` 频繁更新;`useAppServerEvents` 内部 effect 虽不重订阅,但下游子模块因为 deps 变化频繁触发重渲染。

**代码位置**:
- `src/features/threads/hooks/useThreadEventHandlers.ts:2651-2736` `const handlers = useMemo(() => ({...}), [28 项 deps])`
- `src/features/threads/hooks/useThreadEventHandlers.ts:1983-1995` `onNormalizedRealtimeEventTracked = useCallback(...)`
- `src/features/threads/hooks/useThreadEventHandlers.ts:1980+` 多处 `onAgentMessageDeltaTracked` / `onAgentMessageCompletedTracked` / `onItemStartedTracked` / `onItemUpdatedTracked` / `onItemCompletedTracked` / `onCommandOutputDeltaTracked` / `onTerminalInteractionTracked` / `onFileChangeOutputDeltaTracked` / `onTurnStartedTracked` / `onTurnCompletedTracked` / `onTurnErrorTracked` / `onTurnStalledTracked` / `onThreadTokenUsageUpdatedTracked`
- `src/features/app/hooks/useAppServerEvents.ts:2862` `useEffect(..., [])` 闭包用 `handlersRef.current`,不会重订阅
- `src/features/threads/hooks/useThreads.ts:2233` `useAppServerEvents(handlers, {useNormalizedRealtimeAdapters})`

**根因**:`handlers` useMemo 包含 28 个内部 callback,任一 callback 因其 useCallback deps 变化而引用变,`handlers` 引用就变。当前多个 callback 的 deps 包含 `flushPendingRealtimeEvents` / `markRealtimeTurnTerminal` / `emitTurnDomainEvent` / `finalizeTurnDiagnostic` / `quarantineCodexTurn` 等在主 hook 顶层定义的函数,这些函数的 deps 链可能贯穿 5+ 层。

**诊断步骤**:
1. 在 `useThreadEventHandlers` 末尾的 `useMemo(() => handlers, [...])` 入口打 `console.count('handlers-memo-rebuild')`,跑 30s 长 turn 计数。
2. 用 React DevTools Profiler,选中 `useThreads` 父组件,看 "Why did this render?" 面板,看 `handlers` 变化是哪些子 callback 引起。
3. 用 `why-did-you-render` 库临时接入,看下游子组件的 re-render 来源。

**修复方案**:
- 把 `handlers` 拆成 2-3 组(`streamingHandlers` / `lifecycleHandlers` / `diagnosticHandlers`),按事件类型分组,每组独立 useMemo。
- 把顶层 `flushPendingRealtimeEvents` / `markRealtimeTurnTerminal` / `emitTurnDomainEvent` 等"基础设施" callback 用 `useEvent` / 自定义 `useStableCallback` 包装,使其引用永久稳定。
- 用 `useReducer` 模式取代部分 useCallback 链:把状态相关的 dispatcher 集中,只暴露一个稳定的 dispatch。

**验收口径**:
- 30s 长 turn,`handlers` useMemo rebuild 次数 ≤ 5(目前实测 20+)。
- React DevTools:「handlers changed」作为 re-render 原因出现 0 次。

**回归测试**:
- `src/features/threads/hooks/useThreadEventHandlers.test.ts` 新增 case:模拟 100 条 delta,断言 handlers 引用重建次数 < 5。

---

### 根因 5:Home / session list 未虚拟化风险 + 全量投影

**症状假设**:100+ session 或 latest agent run 列表渲染时,瞬间主线程阻塞 200ms+;多 workspace 切换时,每次切换都触发整张表重投影。

**代码位置**:
- `src/features/home/components/HomeChat.tsx`(recent conversation list 直接 `.map`)
- `src/features/threads/hooks/useThreads.ts:2243` `Object.fromEntries(Object.keys(state.threadStatusById).map(...))`(全量 keys 走一遍)
- `src/features/threads/hooks/useThreads.ts:2248-2262` `useMemo(... [state.approvals, state.threadStatusById])`(依赖 threadStatusById,任何 thread 变化都重算)
- `src/features/threads/utils/threadPendingResolution.ts:43` `threadsByWorkspace[workspaceId] ?? []`(全量数组引用)
- `src/features/threads/hooks/threadReducerNormalizedRealtime.ts:128-138` `threadsByWorkspace` 整对象重建

**已校准根因**:`src/features/home/` 没有 `useVirtualizer` 命中;当前 `HomeChat` 对 `latestAgentRuns` 和 workspace picker 直接 map。另一个独立风险是 `useThreads` 暴露的 `backgroundActivityByThread` 用 `Object.fromEntries(Object.keys(state.threadStatusById))`,每次 `threadStatusById` 变化都遍历所有 key。后续修复需要先确认真实 jank 来自 Home recent list、workspace picker、threads sidebar consumer,还是这个全量投影。

**诊断步骤**:
1. React DevTools Profiler:打开 100+ session 的 workspace,记录首次渲染 + 后续切换的总耗时。
2. 在 `useThreads.ts:2243` 打 `console.time('backgroundActivityByThread')`,看耗时。
3. 用 PerformanceObserver 抓 `longtask`,> 50ms 的定位是否是侧栏渲染。

**修复方案**:
- 对实际超长列表 surface 引入 `@tanstack/react-virtual`。若瓶颈是 `HomeChat.latestAgentRuns`,先虚拟化 recent conversation list;若瓶颈是线程侧栏 consumer,在对应 component 虚拟化 session list。
- `backgroundActivityByThread` 改成**懒计算**:只在 sidebar item 实际进入视口时计算,加 LRU cache(`Map<threadId, projection>`)。
- `threadsByWorkspace` 在 reducer 里用 `structural sharing`(immer 或手写),只重建变化的 workspace。

**验收口径**:
- 100+ session workspace 切到 session 列表,首次渲染 < 50ms,滚动 60fps。
- 切 workspace 时 `backgroundActivityByThread` 重新计算次数 = 1(只算目标 workspace)。

**回归测试**:
- `src/features/home/components/Home.perf.test.tsx` 新增 case:mock 200 session,断言 render duration < 100ms。

---

### 根因 6:`convertFileSrc` 资源不在 `mediaResourceOwners` 管理范围

**症状**:长会话里 markdown 含大量图片(`![alt](file://path.png)`),DevTools Memory heap snapshot 显示 `ImageBitmap` / `HTMLImageElement` / `convertFileSrc` 缓存的 blob 引用线性增长;切走再切回 session,内存不释放。

**代码位置**:
- `src/services/mediaResourceOwners.ts`(只管 `URL.createObjectURL` 的 blob URL)
- `src/features/messages/components/Markdown.tsx:6` `import { convertFileSrc } from "@tauri-apps/api/core"`
- `src/features/messages/components/LocalImage.tsx`(图片渲染,使用 `convertFileSrc`)
- `src/features/messages/components/Markdown.tsx:1715+` `handleFileLinkClick` 处理 file:// URL

**已校准根因**:`mediaResourceOwners` 只跟踪 `URL.createObjectURL`。当前 `src/features/messages/components/LocalImage.tsx` 实际 re-export `src/components/common/LocalImage.tsx`;该组件维护 `resolvedSrc`,出错时会 `readLocalImageDataUrl` fallback,但没有 IntersectionObserver、没有 session/workspace switch release,也没有 `convertFileSrc`/data URL owner registry。`convertFileSrc` 与 data URL 是否造成 WebView/GPU 资源累积需要用 Memory snapshot 证明。

**诊断步骤**:
1. DevTools Memory heap snapshot 在 0/5/15/30 分钟各采一次,看 `Detached HTMLImageElement` / `ImageBitmap` / `convertFileSrc` 关联的 blob 数量。
2. 用 `performance.measureUserAgentSpecificMemory()`(若 WebView 支持)看 WebView 总内存。
3. 外部:macOS Activity Monitor / Windows Task Manager 看 webview 进程 RSS,长跑 30 分钟后是否单调增长。

**修复方案**:
- `LocalImage` 加 visibility observer:图片滚出视口且超过 N 张时,主动 `img.src = ''` 释放解码后的 bitmap,只在滚回视口时重新加载。
- 后台 session 的图片(切走的 workspace)整组 `src = ''`,切回时重新加载。
- Tauri `convertFileSrc` 加 `?cacheBust=<turn_id>` 参数,让 WebView 不复用旧资源;切换 turn 时主动 reload。

**验收口径**:
- 长跑 30 分钟后,DevTools heap 中 `ImageBitmap` / `HTMLImageElement` detached 数 < 50。
- 切走 workspace 30s 后,该 workspace 的图片资源全部释放(`performance.measureUserAgentSpecificMemory` 下降)。

**回归测试**:
- `src/features/messages/components/LocalImage.test.tsx` 已有,新增 case:visibility observer 触发后 `img.src === ''`。

---

### 根因 7:`useThreads` setTimeout 多处累积

**症状**:5+ workspace 同时活跃,主线程 setTimeout 队列堆积,长 turn 期间输入响应延迟 100ms+。

**代码位置**:
- `src/features/threads/hooks/useThreads.ts:1043` `const timeoutId = setTimeout(() => {...}, ...)`(某种 refresh)
- `src/features/threads/hooks/useThreads.ts:1113` `await new Promise((resolve) => setTimeout(resolve, 1200))`(reconnect 后 refresh)
- `src/features/threads/hooks/useThreads.ts:1671` `lazyResumeTimerByWorkspaceRef.current[targetId] = setTimeout(() => {...})`
- `src/features/threads/hooks/useThreads.ts:1909` `sharedSessionSyncTimerByThreadRef.current[thread.id] = setTimeout(() => {...})`
- `src/features/threads/hooks/useThreads.ts:761` / `910` / `1793` / `1879` 多处 useEffect 内的 setTimeout

**已校准根因**:`lazyResumeTimerByWorkspaceRef` 已按 workspace 覆盖旧 timer,并在 unmount 清理;`sharedSessionSyncTimerByThreadRef` 按 thread 维度调度并在 signature 变化时覆盖旧 timer,也在 unmount 清理。剩余风险是 timer 管理分散、没有统一 diagnostics,且 shared session sync / refresh / reconnect 等非紧急任务仍多用 `setTimeout` 而非 idle scheduling。N workspace × M shared session 时仍可能产生较高 Timer Fire 密度。

**诊断步骤**:
1. DevTools Performance 录制 30s 长 turn,看 Timer/Fire 事件的密度。
2. 在 `useThreads.ts` 加临时打点:每隔 10s 输出 `lazyResumeTimerByWorkspaceRef.current` / `sharedSessionSyncTimerByThreadRef.current` 的 size。
3. 用 `performance.measureUserAgentSpecificMemory()` 看是否有 timer closure 持有的大对象。

**修复方案**:
- 所有 setTimeout 改成 `requestIdleCallback` 或 `scheduler.postTask`(在主线程空闲时跑)。
- lazyResume / sharedSessionSync 等"非紧急" timer 改成单例合并:每个 workspace 最多 1 个 timer,内部用 map 跟踪待办。
- 关键路径(heartbeat / reconnect)保留 setTimeout 但加 jitter 防止 thundering herd。
- 计时器引用统一管理在 `useRef<Map<string, Timeout>>` 里,组件 unmount / 依赖变化时统一 clear。

**验收口径**:
- 5 workspace 并行,主线程 setTimeout 队列 size < 20。
- 输入响应延迟 < 50ms(从 keydown 到 onChange 触发)。

**回归测试**:
- `src/features/threads/hooks/useThreads.test.tsx` 新增 case:模拟 5 workspace × 3 session 状态,断言所有 timer 引用 size < 20。

---

## 跨层修复优先级

| 优先级 | 根因 | 影响面 | 实施成本 | 建议顺序 |
|---|---|---|---|---|
| P0 | 2 - 优化开关退化 | 全局放大 | 低(1-2 天) | 1 |
| P0 | 1 - child 进程释放缺少 Drop 兜底 | OS 资源 | 中(3-5 天) | 2 |
| P1 | 3 - progressive reveal 边界扫描成本 | CPU 单核 | 中(2-3 天) | 3 |
| P1 | 5 - Home/session 长列表未虚拟化 | 切 workspace 卡顿 | 中(2-3 天) | 4 |
| P2 | 4 - handlers useMemo | 内存 churn | 中(2-3 天) | 5 |
| P2 | 7 - timer 注册分散且缺 idle scheduling | 主线程延迟 | 低(1-2 天) | 6 |
| P2 | 6 - 图片资源释放 | 内存泄漏 | 中(2-3 天) | 7 |

## 实施原则

- **不修改任何产品代码**(`src/**` / `src-tauri/**`)在本次 change。
- 实际修复在后续 `fix-parallel-conversation-runtime-residuals-2026-06` 提案中执行,**严格按本 design.md §"修复方案" + spec.md 的 Requirement 列表**实施。
- 每个修复必须配回归测试(单元 + 集成),并在 `docs/perf/baseline.json` 添对应 metric。
- 修复完成后,跑 `npm run perf:realtime:runtime-report` + `npm run perf:long-list:baseline` + `npm run perf:archive-readiness` 三套 perf gate 确认不退化。

## 复现脚本(reproduce-jank.sh,本 change 沙盒外可执行)

```bash
#!/bin/bash
# 在 Tauri dev 模式下跑这个脚本触发"并行对话卡顿"复现。
# 期望:15 分钟后 CPU 单核 > 80%, 切 workspace 响应 > 200ms。

set -e
APP_DEV_URL="${APP_DEV_URL:-http://localhost:1420}"

# 1. 启动 5 个 workspace (用 curl 调 Tauri command, 或 DevTools console)
echo "Step 1: 启动 5 个 workspace, 每个跑 2 个 long-running turn"

# 2. 监控 child 进程数
echo "Step 2: 每分钟采样一次 child 进程数"
for i in 0 5 10 15 20 25 30; do
  sleep 300
  CHILD_COUNT=$(pgrep -f 'claude-cli|codex' 2>/dev/null | wc -l | tr -d ' ')
  echo "[$i min] claude/codex child processes: $CHILD_COUNT"
done

# 3. 监控 webview 内存
echo "Step 3: DevTools console 里手动:"
echo "  performance.measureUserAgentSpecificMemory().then(r => console.log(r))"

# 4. 抓 longtask
echo "Step 4: DevTools Performance 录制 30s, 导出 longtask > 50ms 的事件"
```

## Stage 划分

### Stage 1. 文档沉淀(本 change 沙盒内执行)

- 落 `proposal.md` / `design.md` / `tasks.md` / `specs/parallel-conversation-runtime-residuals/spec.md`。
- 落 `.trellis/spec/frontend/parallel-conversation-runtime-residuals.md` guide。
- 落 `reproduce-jank.sh` 复现脚本到 `scripts/perf-reproduce-jank.sh`(**沙盒内只写脚本,不实际跑 Tauri**)。

### Stage 2. P0 修复(`fix-parallel-conversation-runtime-residuals-2026-06` 提案,沙盒外)

- 根因 2(优化开关退化)
- 根因 1(child 进程释放缺少 Drop 兜底)

### Stage 3. P1 修复(同上提案,沙盒外)

- 根因 3(progressive reveal 边界扫描成本)
- 根因 5(Home/session 长列表虚拟化)

### Stage 4. P2 修复(同上提案,沙盒外)

- 根因 4(handlers useMemo)
- 根因 7(timer 注册分散且缺 idle scheduling)
- 根因 6(图片资源释放)

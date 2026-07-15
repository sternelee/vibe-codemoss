## Why

多个 Codex 会话并行时，一个已经 authoritative terminal settlement 的会话仍可能被 late、turnless 或错误归属的 progress/item event 重新拉回 Loading。既有 settled-turn quarantine 依赖各事件入口主动检查，保护面分散；当前需要把“谁有权开启 Codex Loading”收口成单一 lifecycle contract，同时保持单会话、Compaction、恢复运行态与 Claude Code 行为不变。

## 目标与边界

- 仅修改 Codex frontend conversation lifecycle，不改变 Claude Code、Gemini、OpenCode 的 processing 语义。
- Codex `isProcessing=true` 只能由 local user send、明确的新 `turn/started`、或 scoped backend reconciliation 返回 matching `running` 建立。
- `item/*`、assistant delta/completion、heartbeat、token usage、reasoning、tool output 等 progress/content event 可以更新内容与 liveness evidence，但不得独立开启或复活 Loading。
- authoritative terminal settlement 后记录 Turn-scoped terminal latch；同一 settled Turn、turnless late event、ambiguous/fallback event 不得复活会话。
- verified successor Turn 必须正常解除旧 Turn 的阻断；手动/自动 Compaction 继续使用独立 `isCompacting` 状态。

## 非目标

- 不修改 Claude Code approval、AskUserQuestion resume、fork、`/compact` 或 CLI child-process lifecycle。
- 不重构统一 EventHub、Tauri event batching、Codex backend protocol 或 provider runtime pool。
- 不新增 timer、active-tab inference、永久 thread-level `finished` Boolean 或新的全局 store。
- 不以 assistant message completion 代替 authoritative terminal settlement。

## What Changes

- 在 Codex processing-start mutation 的共享入口增加 source-aware authority gate，而不是继续为每类 late event 叠加局部判断。
- 将 Codex progress/content event 的 processing mutation 降级为“仅当 matching active Turn 已经 processing 时保持内容更新”，禁止从 settled/idle 状态启动 Loading。
- 保留 local send、verified successor `turn/started` 与 scoped backend `running` 三类启动权限。
- 增加 focused regression tests，覆盖单 Codex、多 Codex 并行、turnless late item、queued late item、successor Turn、Compaction 与 Claude 零影响。

## 技术方案对比

### 方案 A：继续扩展 event ownership fallback 与局部 quarantine

- 优点：沿用现有路径，单点 diff 看似较小。
- 缺点：每新增一种 event 或 dispatch scheduler 都可能漏掉 guard；无法消除 `markProcessing(true)` 权限分散的根因。

### 方案 B：永久 Thread `finished` Boolean

- 优点：实现直观，可以阻断旧事件。
- 缺点：无法区分 settled Turn 与 verified successor Turn，会误伤同一会话的下一轮发送、恢复和 Compaction；需要复杂 reset，容易形成新状态漂移。

### 方案 C：Codex-only Turn-scoped processing-start authority gate（选择）

- 优点：在唯一 mutation boundary 实施 deny-by-default；以现有 Turn identity、quarantine、scoped reconciliation 为事实源，最小化新增状态；Claude 不受影响。
- 代价：需要梳理所有 Codex `markProcessing(true)` 调用来源并补回归矩阵。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `codex-conversation-liveness`: 收紧 Codex settled Turn 后的 Loading revival contract，规定 processing-start authority、successor Turn、scoped recovery、Compaction 与 Claude isolation 行为。

## 验收标准

- 两个 Codex Turn 并行时，A terminal 后，B 的任何 late/turnless/progress event 都不能使 A 再次 Loading。
- A 的 late `item/started`、`item/updated`、heartbeat、token/reasoning/tool event 不得从 settled/idle 状态执行 `markProcessing(A, true)`。
- A 的用户新发送、明确新 `turnId`、matching scoped backend `running` 可以正常进入 Loading。
- 单 Codex 会话正常 start/progress/terminal；自动与手动 Compaction 正常显示独立 compacting 状态。
- Claude Code 现有 processing-start、approval/resume、Compaction 路径保持原样，并有测试证明 gate 不适用于 Claude。
- Focused Vitest、TypeScript typecheck、OpenSpec strict validation 通过。

## Impact

- Frontend lifecycle：`src/features/threads/hooks/useThreadEventHandlers.ts`、`useThreadItemEvents.ts`、`useThreadTurnEvents.ts`、必要的共享类型/测试。
- Event routing：只复核 `useAppServerEvents.ts` ownership 输入，不改变 Tauri event payload/API。
- Backend、存储格式、依赖与 public API：无变更。
- Rollback：回退 source-aware gate 与对应测试即可；既有 quarantine、Compaction 与 Claude 路径保持独立。

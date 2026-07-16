## Context

Frontend 当前已经维护 Codex `activeTurnId`、realtime terminal tracking、`quarantinedCodexTurnsRef` 与 immediate processing owner registry，但 `useThreadItemEvents` 的 raw、normalized、delta 三条 progress/content 路径仍可以直接调用 `markProcessing(threadId, true)`。这让 Loading 同时由 lifecycle event 与内容事件驱动；并行、batch、transition 或 turnless late event 只要绕过某个局部 guard，就能复活 settled 会话。

Codex 与 Claude 共用 `useThreadItemEvents`，因此修复必须在共享代码中显式识别 engine，只收紧 Codex。Codex Compaction 已由 `markContextCompacting` / `isCompacting` / `codexCompactionInFlightByThreadRef` 管理，不需要依赖 conversation `isProcessing`。

## Goals / Non-Goals

**Goals:**

- 让 Codex Loading 只受 lifecycle authority 驱动。
- 阻止 raw item、normalized item、stream delta 等 progress/content event 从 idle/settled 状态调用 `markProcessing(true)`。
- 保留单会话 local send、explicit successor `turn/started` 与 scoped runtime recovery 的正常启动能力。
- 保持 Compaction 和 Claude Code 行为不变。

**Non-Goals:**

- 不修改 backend event schema、batch queue、runtime pool 或 provider binding。
- 不新增永久 Thread finished flag、timer 或 active-tab inference。
- 不改变 terminal settlement、deferred blocker reconciliation、approval 或 AskUserQuestion 语义。

## Decisions

### Decision 1: Codex progress event deny-by-default

在 `useThreadItemEvents` 内建立一个纯函数 authority predicate：Claude/Gemini/OpenCode 延续既有 progress-start behavior，Codex 返回 false。raw item、normalized realtime 与 delta operation 三条路径统一调用该 predicate，再决定是否执行 `markProcessing(true)`。

选择该方式而不是扩展 `shouldSkipCodexTurnEvent`，因为后者依赖每个 router/adapter 入口正确携带 identity；mutation boundary gate 即使 owner attribution 失误也不会复活 Loading。

### Decision 2: 不新增 latch state

既有 terminal/quarantine state 继续负责丢弃 settled Turn 的内容 mutation；本变更只删除 progress event 的 processing-start authority。无需新增 `finished` Boolean 或第二份 lifecycle store，因此没有 successor reset 和状态同步问题。

### Decision 3: 保留三类 Codex start authority

- local user send：optimistic `markProcessing(true)`，覆盖单会话与首条响应前等待。
- explicit `turn/started`：通过既有 exact quarantine guard 后开启 verified successor Turn。
- scoped backend `running`：恢复/重连路径可以基于 matching `workspaceId + threadId + turnId` 恢复，不允许 ownerless progress event代替。

### Decision 4: Compaction 与 Conversation Loading 正交

`thread/compacting`、`thread/compacted`、`thread/compactionFailed` 只更新 `isCompacting` 与 compaction message，不通过 progress-start predicate 开启 conversation Loading。自动/手动 Compaction 可以在 settled Thread 上正常执行。

### Decision 5: 第一阶段严格 Codex-only

Claude Code 的 item/delta processing-start 行为保持原样。虽然 Claude 也发送 canonical `turn/started`，其 approval resume、AskUserQuestion、pending-to-session alias 与 child process lifecycle 不在本次验证范围，YAGNI 下不推广通用 gate。

## Data Flow

```text
Codex local send / verified turn-start / scoped running
  -> markProcessing(true) allowed

Codex item/delta/heartbeat/token/reasoning/tool progress
  -> content/liveness update allowed
  -> markProcessing(true) denied

authoritative terminal
  -> existing terminal tracking + quarantine
  -> markProcessing(false)

Claude progress
  -> existing behavior unchanged
```

## Risks / Trade-offs

- [Risk] Codex backend 某条异常恢复链没有 `turn/started`，过去依赖 item event 自愈 Loading。→ Mitigation：local send 已覆盖正常前台；恢复必须使用 scoped backend `running`，测试覆盖恢复 authority，不允许内容事件猜测。
- [Risk] shared-session Codex native event 被映射到 shared Thread。→ Mitigation：predicate 以 normalized event engine 优先，并对 Thread ID inference 保持现有兼容。
- [Risk] 删除 progress-start 权限后暴露既有 lifecycle 缺口。→ Mitigation：这是预期诊断价值；缺口应修复权威 start/restore 链，而不是恢复 item inference。
- [Trade-off] settled late item 仍可能进入部分 content guard 之前的诊断路径。→ 本变更只保证 Loading 不复活；既有 terminal tracking 继续负责内容丢弃。

## Migration Plan

1. 增加 pure predicate 并接入三条 `markProcessing(true)` progress 路径。
2. 增加 focused tests：Codex deny、Claude allow、单会话 lifecycle、并行 settled revival、Compaction。
3. 运行 focused Vitest、typecheck 与 OpenSpec strict validation。
4. 无数据迁移、配置开关或 backend rollout。

Rollback：回退 predicate 接入即可恢复旧行为；无持久化状态需要清理。

## Open Questions

- 无。若测试发现 scoped recovery 依赖 item inference，应单独修复 recovery authority，不扩大本 change。

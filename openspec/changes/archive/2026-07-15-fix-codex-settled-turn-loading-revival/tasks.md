## 1. Codex Processing-Start Authority

- [x] 1.1 [P0][depends:none] 在 `useThreadItemEvents` 增加 Codex-only progress-start pure predicate；输入为 normalized/inferred engine，输出为是否允许 progress event 调用 `markProcessing(true)`；验证 raw、normalized、delta 三条入口复用同一判断。
- [x] 1.2 [P0][depends:1.1] 将 pure predicate 接入三条 progress/content mutation path，Codex 只更新内容/liveness、Claude 等 Engine 保持现状；验证 focused Vitest 中 Codex 不触发 processing-start、Claude 仍触发。

## 2. Lifecycle Regression Coverage

- [x] 2.1 [P0][depends:1.2] 增加 settled Codex raw/normalized/delta late event 回归测试；输入为 terminal Turn 后到达的 progress，输出为 `isProcessing=false` 且 active Turn 不复活；运行目标 Vitest。
- [x] 2.2 [P0][depends:1.2] 增加单会话与并行 Codex 测试；覆盖 local send/explicit successor 可启动、A settled 后 B progress 不影响 A；运行 `useThreads` / `useThreadItemEvents` focused Vitest。
- [x] 2.3 [P1][depends:1.2] 增加 Codex Compaction 与 Claude 零影响测试；验证 `isCompacting` 独立更新、Claude item/delta processing-start 保持现状。

## 3. Verification And Closure

- [x] 3.1 [P0][depends:2.1,2.2,2.3] 运行 focused Vitest 与 `npm run typecheck`，输出无失败；若发现既有无关失败，记录完整命令与边界。
- [x] 3.2 [P0][depends:3.1] 运行 `openspec validate fix-codex-settled-turn-loading-revival --strict --no-interactive` 并按 artifacts/code/tests 做 verify，输出 implementation 与 spec 一致性证据。

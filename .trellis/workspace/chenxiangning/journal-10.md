# Journal - chenxiangning (Part 10)

> Continuation from `journal-9.md` (archived at ~2000 lines)
> Started: 2026-05-04

---



## Session 310: 补齐第一阶段人工场景回归测试

**Date**: 2026-05-04
**Task**: 补齐第一阶段人工场景回归测试
**Branch**: `feature/v-0.4.13-1`

### Summary

(Add summary)

### Main Changes

任务目标：
- 将此前人工测试提示词覆盖的第一阶段架构硬化高风险场景补齐为自动化回归测试。
- 本次只提交测试，不修改生产代码行为。

主要改动：
- 在 pending thread resolution 测试中覆盖“历史 active thread 不应抢占新 anchored pending session”。
- 在 selected agent session 测试中覆盖同名 thread id 在不同 workspace 下的 storage key 隔离。
- 在 clientStorage 测试中覆盖 reset 后重新 preload schema store，且不暴露 __schemaVersion、不触发无意义 write。
- 在 Messages live behavior 测试中覆盖 retired mossx jump event 不再触发滚动。
- 在 tauri service 测试中覆盖 web runtime fallback state 下 Codex engine_send_message 仍可发送。

涉及模块：
- src/features/threads/hooks/useThreads.pendingResolution.test.ts
- src/app-shell-parts/selectedAgentSession.test.ts
- src/services/clientStorage.test.ts
- src/features/messages/components/Messages.live-behavior.test.tsx
- src/services/tauri.test.ts

验证结果：
- npm exec vitest run src/features/threads/hooks/useThreads.pendingResolution.test.ts src/app-shell-parts/selectedAgentSession.test.ts src/services/clientStorage.test.ts src/features/messages/components/Messages.live-behavior.test.tsx src/services/tauri.test.ts：通过，5 files / 167 tests passed。
- npm run typecheck：通过。
- npm run check:runtime-contracts：通过。
- git diff --check -- src/app-shell-parts/selectedAgentSession.test.ts src/features/messages/components/Messages.live-behavior.test.tsx src/features/threads/hooks/useThreads.pendingResolution.test.ts src/services/clientStorage.test.ts src/services/tauri.test.ts：通过。

后续事项：
- 用户可继续执行本地人工验证；如需提交人工验证结果，可追加独立测试记录或 release note。


### Git Commits

| Hash | Message |
|------|---------|
| `72b36a97` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 311: 记录右侧面板拖拽提交优化

**Date**: 2026-05-04
**Task**: 记录右侧面板拖拽提交优化
**Branch**: `feature/v-0.4.13-1`

### Summary

(Add summary)

### Main Changes

任务目标：
- 按用户选择的方案，将右侧面板上下拖拽改为“拖动中只显示预览，松手后才提交尺寸”。
- 避免拖动过程中实时修改 plan panel 高度引发持续布局重排和卡顿。

主要改动：
- src/features/layout/hooks/useResizablePanels.ts：plan-panel mousemove 不再调用 scheduleResizeApply，也不再实时写入 --plan-panel-height；只更新 liveSizesRef 与 divider transform 预览。mouseup 时一次性提交 --plan-panel-height、React state 和 clientStorage。
- src/features/layout/hooks/useResizablePanels.test.ts：新增回归测试，断言拖动中不写入 --plan-panel-height，松手后提交最终高度并清理拖拽样式。
- src/styles/main.css：补齐 right-panel-divider 的竖向拖拽视觉，沿用左右拖拽的 glow line / capsule handle 风格。

涉及模块：
- layout hook
- desktop layout resize interaction
- global stylesheet resize handle

验证结果：
- npx vitest run src/features/layout/hooks/useResizablePanels.test.ts src/features/layout/components/DesktopLayout.test.tsx src/styles/layout-swapped-platform-guard.test.ts：通过，21 tests passed。
- npm run typecheck：通过。
- npm run check:large-files：通过，found=0。

后续事项：
- 需要用户继续进行桌面端人工测试，重点验证右侧面板上下拖拽松手提交是否符合预期，以及主界面拖动期间是否明显减少卡顿。


### Git Commits

| Hash | Message |
|------|---------|
| `87845311acf113c3fa2909224321fe8d2c476a0f` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 312: 修复流式幕布长文输出卡顿

**Date**: 2026-05-05
**Task**: 修复流式幕布长文输出卡顿
**Branch**: `feature/v-0.4.13-1`

### Summary

(Add summary)

### Main Changes

任务目标:
- 修复 Codex 实时流式输出在长文中后段导致的幕布整体卡顿、按钮冻结、最终一次性刷出的 P0 问题。

主要改动:
- 将 Messages 父层的流式呈现面拆分为稳定 timeline snapshot 与实时 live override，避免整棵消息树在 token 级别持续重算。
- 新增 messages live window / streaming presentation contract，收敛 live assistant 与 live reasoning 的窗口化输出路径。
- 调整 LiveMarkdown、MessagesRows、MessagesTimeline、StatusPanel 与 stream diagnostics，降低长会话持续输出时的 render pressure，同时保留实时 UI 效果。
- 补齐前端 code-spec 与 OpenSpec 行为契约，明确 conversation render surface stability 的回归边界。
- 补充回归测试，覆盖 live window、streaming presentation、windows render mitigation、rows mitigation、diagnostics 与 live markdown。

涉及模块:
- src/features/messages/components
- src/features/messages/utils
- src/features/status-panel/components
- src/features/threads/utils
- .trellis/spec/frontend
- openspec/specs/conversation-render-surface-stability

验证结果:
- npm run lint ✅
- npm run typecheck ✅
- npm run check:large-files ✅
- npm run test ✅ (430 test files 全绿)

后续事项:
- 后续若继续调整实时输出链路，必须保持“稳定 timeline + 实时 live override”这一渲染 contract，不要重新把 token 级更新抬回 Messages 顶层。
- CHANGELOG.md 仍有独立未提交改动，本次 session 未纳入业务提交。


### Git Commits

| Hash | Message |
|------|---------|
| `e3873027` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete

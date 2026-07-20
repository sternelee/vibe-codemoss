## Why

Codex Composer 当前把 context usage indicator 放在输入框内部工具栏，而 Claude Code 已统一放在输入框下方右侧；两套入口的位置、圆环和百分比排版不一致，增加视觉噪音。此次变更只收敛 presentation，不改变 usage snapshot、percentage、tooltip 或 compaction behavior。

## 目标与边界

- Codex context usage indicator 与 Claude Code 使用同一 footer usage slot。
- Codex percentage、圆环尺寸、顺序、间距与 Claude Code indicator 视觉一致。
- 保留 Codex 原有 tooltip、manual compaction、auto-compaction settings 与 lifecycle status。

## 非目标

- 不修改 `resolveDualContextUsageModel` 或任何 token/percentage 计算。
- 不修改 backend/runtime protocol、settings schema、i18n copy 或 provider visibility gate。
- 不改变 Claude Code、HomeChat 或其他 engine 的 context usage behavior。

## What Changes

- 将 Codex dual context summary 从 Composer 输入框内部工具栏迁移到输入框下方右侧的 footer usage region。
- 让 Codex summary 复用 Claude Code indicator 的 percentage-first、ring-second 视觉语言。
- 补充 focused regression tests，锁定位置变化和现有 Codex tooltip/compaction semantics。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `composer-context-dual-view`: 明确 Codex context summary 与 legacy indicator 共用 Composer footer usage region，并在不改变 Codex detail behavior 的前提下保持视觉一致。

## 技术方案对比

1. **移动现有 `ContextBar` summary 到 footer usage slot（采用）**：保留既有 state、tooltip 与 callbacks，只调整 render placement 和 presentation primitives；变更小且 contract 风险最低。
2. **仅用 CSS absolute positioning 把内部 indicator 推到输入框外（不采用）**：代码行数更少，但会依赖输入框高度、branch badge 和 overflow 层级，在窄窗口与 tooltip 场景容易漂移。
3. **直接替换为 `TokenIndicator`（不采用）**：外观天然一致，但会丢失 Codex-specific auto-compaction controls 和 lifecycle status，违反“逻辑不要动”。

## 验收标准

- Codex 对话中，usage indicator 位于输入框下方右侧，与 Claude Code 位置一致。
- percentage 位于圆环左侧；字号、颜色、间距和圆环外观与 Claude Code 一致。
- Codex tooltip 仍展示原有 usage、compaction 状态和 auto-compaction settings。
- Claude Code 与其他 provider 的 indicator behavior 不变。
- focused tests、TypeScript typecheck、scoped ESLint 与 strict OpenSpec validation 通过。

## Impact

- Frontend render/presentation：`src/features/composer/components/**`、相关 Composer CSS。
- Tests：Composer / ContextBar / shared context indicator focused suites。
- Behavior spec：`composer-context-dual-view`。
- 无新增依赖、无 API、storage、runtime 或 backend 影响。

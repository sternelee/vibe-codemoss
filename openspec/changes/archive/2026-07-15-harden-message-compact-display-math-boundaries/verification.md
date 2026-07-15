# Verification

## 结论

PR #834 的公式容器边界修复已保留；本 change 在其基础上补齐对话消息中的 compact multi-line display math 兼容。修复仅规范化 render-time text，不修改持久化消息源、文件预览 `lineMap` 或 streaming lightweight 路径。

## 自动化证据

- `npx vitest run src/features/markdown/compactDisplayMath.test.ts src/features/messages/components/Markdown.math-rendering.test.tsx src/features/files/utils/fileMarkdownDocument.test.ts src/features/files/components/FileMarkdownPreview.test.tsx`
  - 4 test files passed，55 tests passed。
- `npm run typecheck`
  - passed。
- `npm run lint`
  - passed。
- `npm run check:large-files`
  - exit 0；仅报告 6 个未被本 change 修改的既有 baseline 文件。
- `npm run build`
  - passed；保留仓库既有 dynamic import 与 chunk size warning。
- `openspec validate harden-message-compact-display-math-boundaries --strict --no-interactive`
  - valid。
- `git diff --check`
  - passed。

## 全量测试基线

`npm run test` 在 batch 19 遇到 3 个 `Sidebar` 既有失败后停止：

- 一个用例期望 bottom action 数量为 4，实际为 2。
- 两个用例查询 `menuitem`，实际 provider role 为 `menuitemradio`。

这 3 个失败与 PR #834 的已记录 baseline 一致；本 change 未修改 `Sidebar` 或相关 provider，且此前 55 个公式与文件预览目标测试全部通过。

## 隔离审查

- Persisted source：没有写回或迁移历史消息，仅在 `normalizeMarkdownMathForMessage` 的 render-time segment 中处理。
- File preview：没有调用 message-only compact scanner，PR #834 的 source-to-preview `lineMap` contract 保持不变。
- Streaming hot path：`liveRenderMode="lightweight"` 仍跳过 full markdown math normalization；settled full render 才生成 KaTeX。
- Fail closed：unmatched、nested、container mismatch 与 unsafe trailing token 均保持原文，避免错误吞掉后续正文。

## 回滚

如 compact compatibility 出现回归，可独立回滚本 change 的代码提交；PR #834 的 merge commit `af276865` 与文件预览修复无需回滚。回滚后只会失去 MiniMax-style compact multi-line display math 兼容，不影响 canonical GPT delimiter、文件预览或消息原文。

## 人工验证

本轮未执行桌面端手工截图验收；自动化 DOM 测试已覆盖 compact `aligned`、trailing prose、bare matrix、code fence、unmatched input 以及 lightweight-to-full transition。

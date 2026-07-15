## Why

部分模型会把多行 display math 输出为 `$$\begin{aligned}` 开头、`\end{aligned}$$ 后续文字` 结尾的 compact 形式。当前 rich message normalizer 只识别独占一行的 `$$` fence，会把 compact block 内的每一行再次包装，导致 KaTeX error 并污染后续 Markdown；需要在不扩大 lightweight streaming 热路径的前提下补齐这一可信边界。

## 目标与边界

- 只修复 rich message render-time copy 中可信、闭合的 compact multi-line `$$...$$` block。
- canonical GPT-style display math、PR #834 的 list/blockquote `\[...\]`、single-line display math 与 file-preview `lineMap` 必须保持现状。
- 任何无法可靠配对的 compact delimiter 必须原样保留，单个失败 block 不得吞掉后续 prose。

## 非目标

- 不修改 canonical message、Claude/Codex JSONL 或 persisted file source。
- 不在 lightweight streaming 每个 delta 上运行 KaTeX 或 full math normalization。
- 不扩展到任意 LaTeX 猜测、currency parsing 或新的 Markdown parser dependency。

## What Changes

- 在 bare standalone formula promotion 之前，增加 line-aware compact display block canonicalization。
- 只在 opener、closer、container prefix 与 multiline body 均满足可信条件时拆分 compact delimiter；否则 fail unchanged。
- 保护 code fence、canonical display block、single-line display math 与后续 prose。
- 增加 pure normalization、DOM KaTeX、idempotence、malformed input 与 streaming settle 回归覆盖。

## 方案对比

1. **选择：message-only line-aware scanner。** 在 rich message normalizer 内以 bounded linear scan 识别可信 compact block，再交给现有 normalizer；blast radius 最小，不影响 file-preview line mapping 与 streaming hot path。
2. **拒绝：扩大现有 cross-line regex。** 实现更短，但容易跨 code/container/prose 错配，重复 normalization 也更难证明稳定。
3. **拒绝：lightweight 每个 delta 运行 full KaTeX。** 可改善实时视觉，但会重新引入已知 streaming jank，不属于本次兼容修复。

## 验收标准

- MiniMax-style compact `aligned` block 渲染为一个 KaTeX display，`.katex-error` 为 0。
- compact closer 后的中文标题、矩阵与普通段落保持在 math subtree 外。
- canonical GPT-style、PR #834 list/blockquote、single-line display 与 code fence fixtures 保持通过。
- unmatched/nested/incompatible compact delimiter 原样保留；normalizer 重复执行结果不变。
- lightweight path 不新增 full math normalization；settled rich message 使用 full renderer 后正确显示公式。

## Capabilities

### New Capabilities

- `message-compact-display-math-compatibility`: 定义 rich message 对可信 compact multi-line `$$...$$` 的保守 canonicalization、失败隔离与 streaming 边界。

### Modified Capabilities

<!-- None. PR #834 的 message-markdown-latex-compatibility 保持独立。 -->

## Impact

- `src/features/markdown/markdownMath.ts`
- `src/features/messages/components/Markdown.math-rendering.test.tsx`
- 可能补充 streaming render contract focused test，但不改变 runtime API、依赖或 persisted data。

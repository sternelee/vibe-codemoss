# 稳健兼容 compact display math 边界

## Goal

在合并 PR #834 后，修复模型输出 compact multi-line `$$...$$` 时 rich message normalizer 拆坏 `aligned` block 的问题，同时保持 GPT 标准格式、文件预览和 streaming 性能基线。

## Requirements

- 关联 OpenSpec change：`harden-message-compact-display-math-boundaries`。
- 只转换可信闭合的 compact display block，不确定输入保持原文。
- code fence、canonical `$$` block、single-line display、list/blockquote 与 file preview 不回退。
- lightweight streaming 不执行 full math normalization；settle 后 full renderer 必须正确显示。
- normalizer 必须 idempotent，失败 block 不得污染后续 prose。

## Acceptance Criteria

- [ ] MiniMax-style `aligned` fixture 无 `.katex-error`。
- [ ] 后续中文、矩阵与普通段落不进入 KaTeX subtree。
- [ ] GPT canonical fixture 与 PR #834 focused suites 通过。
- [ ] malformed、code fence、idempotence fixtures 通过。
- [ ] typecheck、lint、large-file、OpenSpec strict validation 通过。

## Technical Notes

优先采用 message-only bounded line scanner，在 bare formula promotion 前 canonicalize compact delimiter；不新增依赖，不修改 public API 与 persisted source。

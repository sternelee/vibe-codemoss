# Align Codex model reasoning capabilities

## Goal

让 Codex composer 按 selected model 的 runtime `model/list` metadata 展示 reasoning effort；公共默认值仅作为字段缺失时的 fallback。

## Requirements

- runtime `supportedReasoningEfforts` 与 `defaultReasoningEffort` 优先。
- 保留公共 degraded fallback，不维护逐模型静态矩阵。
- 支持已知 `ultra` effort 的展示、选择与发送。
- 不修改 backend protocol 和其他 engine contract。

## Acceptance Criteria

- [ ] 不同模型可展示不同 runtime options/default。
- [ ] runtime metadata 不被 fallback 覆盖或裁剪。
- [ ] metadata 缺失时公共 fallback 可用。
- [ ] `ultra` 通过 typed Composer 链路。
- [ ] focused tests、typecheck、lint、OpenSpec strict validation 通过。

## Technical Notes

OpenSpec change: `align-codex-model-reasoning-capabilities`

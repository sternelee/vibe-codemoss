## ADDED Requirements

### Requirement: Codex health checks allow bounded startup recovery

Codex session health-check timeout MUST 覆盖 runtime startup 与 bounded recovery 的正常窗口，并 MUST 在超时后返回可诊断 failure，而不得过早把仍可恢复的 session 判定为 dead。

#### Scenario: Runtime responds within the recovery window

- **WHEN** Codex runtime 启动或恢复耗时超过旧探测阈值但仍在 bounded recovery window 内完成
- **THEN** health check MUST 接受该有效响应，且不得触发错误的 disconnect cleanup

#### Scenario: Runtime exceeds the bounded timeout

- **WHEN** Codex runtime 在完整 health-check window 内没有有效响应
- **THEN** 系统 MUST 返回明确 timeout evidence，并允许既有 recovery policy 决定下一步

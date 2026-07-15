## ADDED Requirements

### Requirement: One-click Codex creation remembers the last valid provider

One-click Codex session creation MUST 记忆最近一次用户明确选择且仍可用的 provider profile，并 MUST 将该选择仅用于未来新会话。

#### Scenario: Create another Codex session

- **WHEN** 用户此前选择 managed provider 创建会话且该 provider 仍存在
- **THEN** 下一次 one-click creation MUST 默认使用该 provider，同时保持用户可切换

#### Scenario: Remembered provider was removed

- **WHEN** 最近 provider 已删除或不可用
- **THEN** one-click creation MUST 回退到 disk/default provider contract，且不得改变既有 thread binding

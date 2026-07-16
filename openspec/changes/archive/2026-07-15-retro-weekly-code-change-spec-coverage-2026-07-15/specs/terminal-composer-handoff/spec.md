## ADDED Requirements

### Requirement: Terminal context can be sent to Composer

Terminal MUST 为非空 selection 和可识别 file path 提供 Send to Composer action，并 MUST 将内容交给当前 workspace 的 Composer。

#### Scenario: Send selected terminal text

- **WHEN** 用户对非空 Terminal selection 执行 Send to Composer
- **THEN** Composer MUST 接收该 selection 作为一次 context insertion

#### Scenario: Send a terminal file path

- **WHEN** 用户对 Terminal 中可识别的 file path 执行 Send to Composer
- **THEN** Composer MUST 接收可解析的 file reference，且 workspace context MUST 保持不变

### Requirement: Terminal handoff does not duplicate content

一次 Send to Composer intent MUST 只产生一次 Composer insertion，即使 context-menu callback 与 selection state 同时更新。

#### Scenario: Selection state settles after handoff

- **WHEN** Terminal selection 在 handoff 前后触发多次 selection events
- **THEN** Composer MUST 只包含一份被发送的文本

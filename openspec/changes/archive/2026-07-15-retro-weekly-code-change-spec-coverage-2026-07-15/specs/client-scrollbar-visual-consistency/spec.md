## ADDED Requirements

### Requirement: Shared scroll containers use stable geometry

客户端主要 scroll containers MUST 使用一致的 scrollbar width、track 与 thumb geometry，并 MUST 保持 content width 在 hover/active 状态下稳定。

#### Scenario: Scroll across application surfaces

- **WHEN** 用户在 message、sidebar、settings、file 或 Terminal scroll container 中滚动
- **THEN** scrollbar geometry MUST 保持一致，且 scrollbar appearance 不得导致内容横向跳动

### Requirement: Scrollbar colors follow active theme

Scrollbar thumb/track MUST 使用带 fallback 的 theme tokens，Terminal scrollbar MUST 与应用当前 light/dark theme 保持可见对比度。

#### Scenario: Switch application theme

- **WHEN** 用户切换 light/dark theme
- **THEN** Terminal 和 shared scroll containers 的 scrollbar MUST 更新为对应 theme colors，且 token 缺失时仍有可见 fallback

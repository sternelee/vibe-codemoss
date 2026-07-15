# message-tool-marker-shell Specification

## Purpose
TBD - created by archiving change retro-message-tool-marker-shell. Update Purpose after archive.
## Requirements
### Requirement: Message tool blocks MUST use a shared marker shell

消息工具块 SHALL 通过 shared marker shell 渲染 common chrome，同时保留各 tool type 的 evidence content。

#### Scenario: 工具块折叠

- **WHEN** 工具块折叠
- **THEN** 当 Bash/Edit/Read/Search/MCP/Generic tool block 折叠展示时，必须显示稳定 marker、status、summary，并保留可展开的 details。

#### Scenario: 工具块展开

- **WHEN** 工具块展开
- **THEN** 当用户展开 tool block 时，tool-specific details 必须在共享 shell 内完整可见。

### Requirement: Tool block layout MUST NOT inflate virtual blank rows

Tool block chrome SHALL 避免让 timeline placeholder rows 预留异常高度。

#### Scenario: 混合 tool cards 和 placeholder

- **WHEN** 混合 tool cards 和 placeholder
- **THEN** 当 timeline 同时渲染 tool cards 与 virtual blank rows 时，placeholder 高度不得被 tool-card shell 样式撑大，scrolling 必须稳定。

### Requirement: Generic tool rows share marker semantics

Generic tool block MUST 使用与 sibling tool rows 一致的 marker shell、alignment 和 accessible label semantics，不得因 fallback renderer 产生不同的行高或错位 marker。

#### Scenario: Render an unknown generic tool block

- **WHEN** message renderer 收到没有 dedicated renderer 的 tool block
- **THEN** generic row MUST 与相邻 tool rows 对齐，并保持 tool identity 可读

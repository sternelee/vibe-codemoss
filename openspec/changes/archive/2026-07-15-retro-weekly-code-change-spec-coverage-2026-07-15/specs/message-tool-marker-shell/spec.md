## ADDED Requirements

### Requirement: Generic tool rows share marker semantics

Generic tool block MUST 使用与 sibling tool rows 一致的 marker shell、alignment 和 accessible label semantics，不得因 fallback renderer 产生不同的行高或错位 marker。

#### Scenario: Render an unknown generic tool block

- **WHEN** message renderer 收到没有 dedicated renderer 的 tool block
- **THEN** generic row MUST 与相邻 tool rows 对齐，并保持 tool identity 可读

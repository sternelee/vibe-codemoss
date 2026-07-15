## ADDED Requirements

### Requirement: Hub file selection uses one visual contract

Git Hub file sections MUST 让 row selection、checkbox state 与 section-level actions 表达同一 selected path set，且 selection styling MUST 不依赖另一个 panel 的 lazy CSS。

#### Scenario: Select files from a Hub section

- **WHEN** 用户在 changed、staged 或 untracked section 选择文件
- **THEN** row、checkbox 与 section action MUST 反映相同 selection，且切换 section 不得产生 phantom selection

### Requirement: Diff file opening preserves repository-relative identity

Git diff file opening MUST 结合 workspace root 与 repository-relative path 解析目标文件，sub-repository entry MUST NOT 被错误拼接到 parent repository root。

#### Scenario: Open a file changed in a sub-repository

- **WHEN** diff entry 属于 workspace 内的 nested Git repository
- **THEN** file open action MUST 定位到 nested repository 中的真实文件，而不得打开 parent root 下的同名或不存在路径

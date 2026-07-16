## ADDED Requirements

### Requirement: Commit message generation can reuse the last valid configuration

AI commit message surface MUST 提供复用最近一次有效 engine/model/language configuration 的 quick option，并 MUST 在配置不可用时回退到现有默认选择流程。

#### Scenario: Reuse the last generation configuration

- **WHEN** 用户此前成功使用一组 generation configuration 且再次打开 commit message generation
- **THEN** quick option MUST 恢复该有效配置，而无需逐项重新选择

#### Scenario: Last configuration is no longer available

- **WHEN** 记录的 engine、model 或 provider 已不在当前 catalog
- **THEN** 系统 MUST 使用现有 fallback，不得启动不可用配置或覆盖当前 commit scope

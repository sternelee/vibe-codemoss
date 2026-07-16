## ADDED Requirements

### Requirement: Built-in Codex model families remain selectable

内置 Codex model catalog MUST 为产品声明支持的 model family 提供稳定 id、display label 与 reasoning metadata，Composer selector MUST 从同一 catalog 渲染选项。

#### Scenario: Render a newly supported model family

- **WHEN** built-in catalog 增加 5.6 series model
- **THEN** Composer model selector MUST 展示对应选项，且 selection type MUST 接受该 model id

#### Scenario: Use catalog metadata without runtime hydration

- **WHEN** dynamic model hydration 暂不可用
- **THEN** built-in supported models MUST 继续作为可选择 fallback，且不得伪造 provider origin

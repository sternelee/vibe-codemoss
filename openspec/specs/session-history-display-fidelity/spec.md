# session-history-display-fidelity Specification

## Purpose

定义 session title、command prompt 与参数在 sidebar/history projection 中的展示保真。

## Requirements

### Requirement: Session rows preserve meaningful titles

Session sidebar/history projection MUST 优先展示可用的 explicit title，并在 fallback 时使用规范化 user intent，而不得显示内部 command wrapper 或无意义空标题。

#### Scenario: Display a session with an explicit title

- **WHEN** history entry 提供非空 session title
- **THEN** session row MUST 展示该 title，并保持 engine/provider metadata 可辨识

#### Scenario: Build a title from user intent

- **WHEN** explicit title 不存在但首条用户 intent 可用
- **THEN** fallback title MUST 使用去除内部 wrapper 后的可读 intent

### Requirement: Slash-command prompts retain arguments in history

History normalization MUST 保留用户输入的 slash command 及其 arguments，不得因识别 command marker 而丢弃整条 user prompt。

#### Scenario: Reopen a slash-command session

- **WHEN** 历史 user message 为带 arguments 的 slash command
- **THEN** reopened transcript 与 session display MUST 保留 command 和 arguments

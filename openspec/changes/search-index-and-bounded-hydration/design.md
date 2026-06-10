# Design / 设计

## Index Model / 索引模型

Per-workspace index should group provider-specific normalized candidates:

- files: path/name tokens, extension, workspace id, source version;
- threads/messages: title/preview tokens, thread id, updated timestamp/version;
- kanban/history/skills/commands: stable id, label tokens, provider kind.

Content-sensitive fields should remain bounded previews or hashes where diagnostics are persisted.

## Hydration Policy / 水合策略

Active workspace hydrates first. Other workspaces use limited concurrency and can continue in background. Query results must expose whether global hydration is partial or complete.

## Query Policy / 查询策略

Query should read cached indexes and provider candidates. Async provider work must carry query/version token and drop stale results when query changes or palette closes.

## Metrics / 指标

`reportSearchMetrics` should record provider elapsed time, candidate count, result count, index hit/miss, hydration state, and stale drop count. Do not record full message/file content.

## Rollback / 回滚

Index use can be disabled provider-by-provider. Bounded hydration should remain even if a provider falls back to raw compute.

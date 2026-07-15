# conversation-file-change-surface-parity Specification

## Purpose

Defines the conversation-file-change-surface-parity behavior contract, covering Conversation File-Change Facts MUST Normalize Into Shared Canonical Entries.
## Requirements
### Requirement: Conversation File-Change Facts MUST Normalize Into Shared Canonical Entries

系统 MUST 在消息幕布、右侧 `workspace session activity`、底部 `status panel` 读取 conversation file-change 事实前，先归一为共享 canonical file entries。

#### Scenario: multi-file change produces complete canonical entries

- **WHEN** 同一次 conversation file-change fact 包含多个受影响文件
- **THEN** 系统 MUST 为每个文件生成独立 canonical entry
- **AND** canonical entry MUST 至少包含 `filePath`、`status`、`additions`、`deletions`
- **AND** bundle aggregate MUST 与这些 entries 可追溯一致

#### Scenario: sparse historical payload uses shared fallback extraction

- **WHEN** 历史 replay 的 file-change payload 缺少部分 diff 或 path 证据
- **THEN** 系统 MAY 使用 fallback extraction
- **AND** 该 fallback MUST 由共享 canonical adapter 统一完成
- **AND** 不同 surface MUST NOT 各自推断出不同的文件集合或 `+/-`

### Requirement: Conversation File-Change Surfaces MUST Stay In Parity

同一 conversation file-change fact 在消息幕布、右侧 activity panel、底部 status panel 的文件数量与 diff 统计 MUST 保持一致。

#### Scenario: file counts match across all surfaces

- **WHEN** 同一 file-change fact 同时出现在消息幕布、右侧 activity panel、底部 status panel
- **THEN** 三个 surface MUST 展示相同的受影响文件数量
- **AND** 右侧 activity panel MUST NOT 因 summary 压缩而少展示文件

#### Scenario: per-file stats match across all surfaces

- **WHEN** 同一路径在多个 surface 上被渲染
- **THEN** 该路径的 `status`、`additions`、`deletions` MUST 保持一致
- **AND** 系统 MUST 继续以 `filePath` 作为跨 surface 的 canonical identity

#### Scenario: aggregate additions and deletions are normalized

- **WHEN** surface 需要显示某次 file-change event 或当前 thread 的 aggregate `+/-`
- **THEN** aggregate MUST 来自同一 canonical entries source
- **AND** 消息幕布 header、右侧 summary、底部 `Edits` 汇总 MUST 保持一致

### Requirement: Surface Parity MUST Survive History Reopen And Replay

系统 MUST 在 conversation 历史 reopening / replay 场景下继续保持 file-change parity，而不是只在实时阶段一致。

#### Scenario: reopened conversation keeps the same file-change parity

- **WHEN** 用户重新打开一个已存在 file-change 历史的 conversation
- **THEN** 消息幕布、右侧 activity panel、底部 status panel MUST 继续展示一致的文件数量与 `+/-`
- **AND** 系统 MUST NOT 在历史 reopening 后退化为只剩 summary 或不完整文件列表

### Requirement: Each turn can expose a file-change summary card

Conversation timeline MUST 将一个 turn 的 canonical file-change facts 聚合为 turn-level summary card，并 MUST 与其他 file-change surfaces 使用同一 entries/stats truth。

#### Scenario: Render a turn with changed files

- **WHEN** completed or active turn 包含一个或多个 canonical file-change entries
- **THEN** timeline MUST 展示一次 turn-level summary，且 file count 与 additions/deletions MUST 与共享 facts 一致

### Requirement: Pending next turn does not detach the prior file-change card

当新 turn 已 pending 但尚未形成稳定 timeline content 时，前一 turn 的 file-change summary MUST 保持与其 owner turn 绑定，不得漂移或消失。

#### Scenario: Queue a new turn after file changes

- **WHEN** 前一 turn 有 file-change summary 且下一 turn 进入 pending
- **THEN** 前一 summary card MUST 保持可见并归属于原 turn，直到正常 timeline projection 接管

### Requirement: Sparse Added-File Facts MUST Preserve Canonical Diff Access

当 conversation file-change fact 表示新增文件但不携带 inline diff 时，消息幕布 MUST 在不改变其他 change kind 行为的前提下，复用已有 Workspace Git diff navigation 保持该文件的 canonical diff 可达性。

#### Scenario: added file without inline diff opens canonical Git diff

- **WHEN** 消息幕布收到 normalized kind 为 `added`、包含有效 `filePath`、但缺少 inline diff 的 file-change entry
- **AND** tool output 为空或不满足 structured diff header contract
- **AND** 当前 surface 提供 `onOpenDiffPath`
- **THEN** 用户激活该 row MUST 调用 `onOpenDiffPath(filePath)`
- **AND** 系统 MUST NOT 从 shell command 文本或当前磁盘内容伪造 event-time inline diff
- **AND** 普通 CLI/Markdown output MUST NOT 被计入 diff `additions/deletions`

#### Scenario: added file with inline diff keeps inline preview priority

- **WHEN** 新增文件 entry 已携带可解析的 inline diff
- **THEN** 用户激活该 row MUST 展开现有 inline preview
- **AND** 系统 MUST NOT 同时触发 Workspace Git diff navigation

#### Scenario: other change kinds preserve existing missing-diff behavior

- **WHEN** `modified`、`deleted` 或 `renamed` entry 缺少 inline diff
- **THEN** 系统 MUST 保持其现有 row behavior
- **AND** added-file fallback MUST NOT 被应用到这些 change kind

#### Scenario: navigation callback is unavailable

- **WHEN** 新增文件 entry 缺少 inline diff 且当前 surface 未提供 `onOpenDiffPath`
- **THEN** row MUST 保持稳定的非交互展示
- **AND** 系统 MUST NOT 抛出 runtime error


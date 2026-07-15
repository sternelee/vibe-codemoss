## ADDED Requirements

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

## ADDED Requirements

### Requirement: Codex Loading MUST Be Started Only By Lifecycle Authority

Frontend MUST restrict Codex conversation Loading startup to local user send, an explicit verified successor `turn/started`, or a scoped backend status proving the matching `workspaceId + threadId + turnId` is running. Codex progress/content events including raw or normalized item events, assistant delta/completion, heartbeat, token usage, reasoning, tool output, request-user-input, and generated-image progress MUST NOT independently set `isProcessing=true` for an idle or settled Thread. This restriction MUST NOT change Claude Code processing behavior.

#### Scenario: parallel Codex progress cannot revive settled sibling
- **WHEN** Codex Threads A and B run in parallel, A reaches authoritative terminal settlement, and B continues emitting progress
- **THEN** B progress MUST remain scoped to B
- **AND** no late, turnless, ambiguous, queued, raw, or normalized progress event MAY set A back to Loading

#### Scenario: settled Codex item event cannot start processing
- **WHEN** a settled Codex Thread receives `item/started`, `item/updated`, assistant delta, reasoning, tool, heartbeat, token, or equivalent progress evidence
- **THEN** frontend MAY record content or diagnostic evidence only when existing terminal guards allow it
- **AND** frontend MUST NOT call the processing-start mutation for that event

#### Scenario: local send starts a successor Codex turn
- **WHEN** the user sends a new message from an idle or settled Codex Thread
- **THEN** frontend MUST start optimistic Loading for the successor request
- **AND** a later explicit new `turnId` MUST bind as the active successor without removing quarantine from the old settled Turn

#### Scenario: verified successor turn starts normally
- **WHEN** a Codex Thread receives `turn/started` with a non-quarantined successor `turnId`
- **THEN** frontend MUST set that successor active and processing
- **AND** a duplicate `turn/started` for the settled predecessor MUST remain blocked

#### Scenario: scoped backend running restores Codex loading
- **WHEN** renderer state is rebuilt and a scoped backend query proves the same `workspaceId + threadId + turnId` is running
- **THEN** frontend MAY restore Loading for that matching Codex Turn
- **AND** an ownerless item or progress event MUST NOT act as recovery authority

#### Scenario: Codex compaction remains independent
- **WHEN** automatic or manual Codex Compaction runs before, during, or after a conversation Turn settlement
- **THEN** frontend MUST update the independent compacting state and compaction messages
- **AND** the processing-start gate MUST NOT block Compaction or convert Compaction into ordinary conversation Loading

#### Scenario: single Codex conversation remains correct
- **WHEN** one Codex conversation performs local send, explicit Turn start, progress, and authoritative terminal settlement
- **THEN** Loading MUST start and stop normally
- **AND** removing progress-event startup authority MUST NOT leave the normal single-session path idle or stuck

#### Scenario: Claude Code behavior is unchanged
- **WHEN** Claude Code receives its existing Turn and item/delta event sequence, including approval or AskUserQuestion resume paths
- **THEN** this Codex-only processing-start gate MUST NOT change Claude processing mutations, Compaction, aliases, or terminal behavior

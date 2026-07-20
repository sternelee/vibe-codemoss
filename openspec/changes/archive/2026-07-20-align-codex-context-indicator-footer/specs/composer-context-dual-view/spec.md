## MODIFIED Requirements

### Requirement: Codex-Only Visibility Boundary
The dual context usage view MUST only be active in Codex engine sessions. When active, the Codex summary MUST occupy the same Composer footer usage region and use the same compact percentage/ring visual language as the legacy context indicator, while preserving Codex-specific detail and compaction interactions.

#### Scenario: Codex engine enables new view behavior
- **WHEN** current engine/provider is `codex` and dual-view capability is enabled
- **THEN** Composer SHALL render the new Codex context summary view in the input footer usage region
- **AND** Codex legacy token indicator SHALL be hidden in the same slot
- **AND** the percentage SHALL appear before a ring whose dimensions, stroke treatment, spacing, and muted foreground match the Claude Code context indicator
- **AND** the existing Codex tooltip, manual compaction action, auto-compaction settings, and lifecycle status semantics SHALL remain available

#### Scenario: Non-codex engines keep legacy-only behavior
- **WHEN** current engine/provider is not `codex`
- **THEN** system SHALL NOT render the new dual context usage view
- **AND** existing legacy token indicator behavior and footer placement SHALL remain unchanged

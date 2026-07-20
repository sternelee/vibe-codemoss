## ADDED Requirements

### Requirement: Stable Author Timeline Accent

The Git History commit list SHALL assign a deterministic visual accent to each commit author identity without replacing textual author metadata or interaction-state feedback.

#### Scenario: Resolve author identity

- **WHEN** a commit row includes `authorEmail`
- **THEN** the system SHALL derive its author accent from normalized `authorEmail`
- **AND** when `authorEmail` is absent the system SHALL fall back to normalized `author`
- **AND** when both values are absent the system SHALL use one stable fallback accent

#### Scenario: Preserve color across list lifecycle

- **WHEN** the same author appears after refresh, pagination, search filtering, or virtualized row reuse
- **THEN** the system SHALL render the same author accent independent of row position or discovery order

#### Scenario: Distinguish authors in the timeline

- **WHEN** visible commits resolve to different palette slots
- **THEN** their graph nodes SHALL use different author accents
- **AND** each row line segment SHALL use a subdued form of its node accent
- **AND** the author label SHALL retain readable contrast against the active application theme

#### Scenario: Preserve interaction semantics

- **WHEN** a commit row is hovered, focused, or selected
- **THEN** existing interaction-state styling SHALL remain visible
- **AND** author color SHALL remain an auxiliary cue rather than the only way to identify the author

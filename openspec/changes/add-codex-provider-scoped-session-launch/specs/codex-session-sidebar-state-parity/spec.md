## MODIFIED Requirements

### Requirement: Codex New Conversation Start MUST Be Idempotent While In Flight

When the frontend starts a new Codex conversation for the same workspace, folder, provider profile, model, and launch mode/spec-root when present, concurrent callers MUST reuse the same in-flight backend start instead of creating multiple backend sessions. Starts for different provider profiles or materially different launch shapes MUST remain independent so provider-scoped runtimes can launch in parallel.

#### Scenario: concurrent codex starts reuse one backend session for the same provider profile

- **WHEN** two or more callers invoke new Codex conversation creation for the same workspace, folder, provider profile, selected model, and launch mode/spec-root before the first backend start resolves
- **THEN** the system MUST call the backend start command only once
- **AND** all callers MUST receive the same created thread id
- **AND** the sidebar MUST materialize only one new Codex conversation

#### Scenario: different provider profiles do not share the same in-flight start

- **WHEN** two callers invoke new Codex conversation creation for the same workspace and folder
- **AND** the selected provider profiles are different
- **THEN** the system MUST keep those starts as separate in-flight operations
- **AND** each resolved thread MUST retain its own provider profile binding
- **AND** the sidebar MAY materialize both conversations

#### Scenario: different launch shapes do not share the same in-flight start

- **WHEN** two callers invoke new Codex conversation creation for the same workspace, folder, and provider profile
- **AND** the selected model or launch mode/spec-root differs
- **THEN** the system MUST keep those starts as separate in-flight operations
- **AND** each resolved thread MUST retain the launch metadata used to start it

#### Scenario: in-flight reuse preserves activation request

- **WHEN** a caller reuses an in-flight Codex start and requests activation
- **THEN** the resolved shared thread MUST become active for that workspace
- **AND** the system MUST NOT dispatch a second create/materialize side effect for that same thread

#### Scenario: failed in-flight start can be retried

- **WHEN** an in-flight Codex start fails
- **THEN** the in-flight guard MUST be released
- **AND** a later user action MAY attempt a new backend start for the same workspace, folder, and provider profile

## MODIFIED Requirements

### Requirement: Manual Git Status Refresh Affordance

The Git Diff panel SHALL expose a manual refresh affordance for the active workspace Git status without changing the existing automatic polling cadence. In multi-repository mode, each rendered repository change group SHALL expose the same aggregate status refresh affordance in its header.

#### Scenario: User manually refreshes Git status

- **WHEN** the Git Diff panel is visible for an active workspace
- **THEN** the panel SHALL render an icon button with an accessible refresh status label
- **AND** clicking the button SHALL invoke the existing Git status refresh callback.

#### Scenario: Multi-repository headers retain refresh parity

- **WHEN** the Git Diff panel renders repository change groups in multi-repository mode
- **THEN** each repository group header SHALL expose a keyboard-accessible refresh icon button
- **AND** activating any repository header refresh button SHALL invoke the existing aggregate repository status refresh callback
- **AND** an aggregate refresh already in flight SHALL disable the repository header refresh buttons until it settles.

#### Scenario: Manual refresh reuses existing status path

- **WHEN** the refresh affordance is activated
- **THEN** the frontend SHALL reuse the existing `refreshGitStatus` / queued refresh path
- **AND** it SHALL NOT introduce a new backend command or duplicate Git status bridge logic.

#### Scenario: Automatic polling remains unchanged

- **WHEN** the manual refresh affordance is added
- **THEN** the existing active/background Git status polling cadence SHALL remain unchanged
- **AND** existing Git diff, root scan, commit, stage, unstage, discard, and preview actions SHALL remain available.

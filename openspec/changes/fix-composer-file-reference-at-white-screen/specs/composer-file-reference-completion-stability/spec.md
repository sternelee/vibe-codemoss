## ADDED Requirements

### Requirement: Composer file-reference completion MUST normalize runtime sources

The composer file-reference completion provider MUST ignore malformed, blank, or non-string file and directory paths before creating completion items.

#### Scenario: malformed source paths are skipped
- **WHEN** the composer receives file-reference completion source entries that are blank, duplicated, or not strings
- **THEN** the completion provider MUST skip invalid entries
- **AND** it MUST return only valid unique file-reference completion items
- **AND** it MUST NOT throw during dropdown item generation

#### Scenario: malformed lazy directory children are skipped
- **WHEN** nested file-reference completion loads workspace directory children and the payload contains malformed entries
- **THEN** the completion provider MUST skip invalid child entries
- **AND** it MUST keep valid child entries available in the dropdown
- **AND** it MUST NOT crash the composer or app shell

### Requirement: Composer inline file-tag rendering MUST fail locally

The composer MUST isolate inline file-tag rendering failures so a `contenteditable` DOM rewrite or cursor-restoration exception does not blank the app shell.

#### Scenario: file tag render exception leaves composer recoverable
- **WHEN** the composer attempts to render an inline `@` file-reference tag and the DOM rewrite or cursor restoration fails
- **THEN** the failure MUST be logged through existing frontend diagnostics
- **AND** the composer MUST clear transient tag-render state that would keep retrying the same failed render
- **AND** the app shell MUST remain mounted and interactive

#### Scenario: raw file reference remains editable after render degradation
- **WHEN** inline file-tag rendering degrades after a failure
- **THEN** the raw file-reference text MUST remain editable in the composer
- **AND** subsequent normal typing MUST continue to update composer content

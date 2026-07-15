## ADDED Requirements

### Requirement: Rich messages conservatively canonicalize compact multi-line display math
The rich message renderer SHALL canonicalize a compact multi-line dollar display block only when opener and closer form a trustworthy compatible pair, and SHALL keep the formula body and trailing prose outside each other's render subtrees.

#### Scenario: Compact aligned block followed by prose
- **WHEN** a model message starts a multi-line block with `$$\begin{aligned}` and ends it with `\end{aligned}$$` followed by prose
- **THEN** the renderer SHALL produce one valid KaTeX display without `.katex-error`
- **AND** the trailing prose SHALL remain outside the KaTeX subtree

#### Scenario: Canonical display block remains stable
- **WHEN** a message uses delimiter-only `$$` lines around a multi-line formula
- **THEN** normalization SHALL preserve its canonical structure and rendered result

#### Scenario: Ambiguous compact block fails unchanged
- **WHEN** a compact opener is unmatched, nested, crosses an incompatible Markdown container, or appears inside a code fence
- **THEN** normalization MUST preserve the candidate source instead of inserting speculative delimiters
- **AND** following prose MUST NOT be consumed as part of a fabricated math block

### Requirement: Compact display normalization is idempotent and isolated from streaming hot path
The system MUST produce the same rich-message normalized value after repeated compact display normalization and MUST NOT run the full math pipeline for each lightweight streaming delta.

#### Scenario: Repeated normalization is stable
- **WHEN** a trusted compact display message is normalized twice
- **THEN** the second result MUST equal the first result byte-for-byte

#### Scenario: Streaming settles to rich math rendering
- **WHEN** an assistant message uses lightweight rendering while live and full rendering after settlement
- **THEN** the live path MUST remain outside the full math normalization chain
- **AND** the settled full path SHALL render the compact formula through KaTeX

### Requirement: Existing math compatibility remains intact
The compact display fix MUST preserve canonical GPT-style dollar math, PR #834 list/blockquote bracket math, single-line display math and file-preview line mapping.

#### Scenario: Existing regression corpus remains green
- **WHEN** focused message and file-preview math suites execute
- **THEN** canonical, container-prefixed, nested-dollar and `lineMap` assertions MUST continue to pass

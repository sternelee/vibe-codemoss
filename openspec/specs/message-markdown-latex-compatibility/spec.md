# message-markdown-latex-compatibility Specification

## Purpose

定义消息区 Markdown 在正文与 LaTeX 公式混排场景下的边界安全、display math 容错与 fenced latex 向后兼容契约，确保当前实现对合法 inline 公式、独立公式行和单行 `$$...$$` 的渲染行为稳定可回归。
## Requirements
### Requirement: Message Markdown MUST Preserve Valid Inline LaTeX Structure During Normalization

消息区 Markdown 在进入 `remark-math` 前做正文归一化时，MUST 保持合法 inline LaTeX 的原始结构，不得因为括号包裹片段的宽松替换而破坏已有公式。

#### Scenario: inline formula with function-style parentheses remains intact

- **WHEN** 正文包含合法 inline LaTeX，例如 `$\\frac{d\\theta}{dt}=-\\nabla_\\theta \\mathcal{L}(\\theta)$`
- **THEN** 系统 MUST 保留 `\\mathcal{L}(\\theta)` 的括号结构
- **AND** 渲染结果 MUST NOT 出现由预处理引入的残留文本如 `\\theta$`

#### Scenario: prose-wrapped latex fragment still normalizes to inline math

- **WHEN** 正文包含由普通括号或全角括号包裹的独立 LaTeX 片段，例如 `（ \\bar{x}=\\frac{1}{n}\\sum x_i ）` 或 `( \\sigma(z)=... )`
- **THEN** 系统 SHOULD 将该独立片段归一为 inline math
- **AND** 该转换 MUST NOT 误伤前后相邻的非目标文本

### Requirement: Message Markdown MUST Recover Standalone Display Formulas Inside Prose

当正文中出现单独成行、结构明显的 LaTeX 公式时，消息区 Markdown MUST 将其送入 display math 渲染路径，而不是按普通文本残留。

#### Scenario: bare standalone latex line is rendered as display math

- **WHEN** 正文段落之间插入一行独立裸 LaTeX 公式，例如 `\\frac{d\\theta}{dt}=-\\nabla_\\theta \\mathcal{L}(\\theta)`
- **THEN** 系统 MUST 将该行作为 display math 渲染
- **AND** 用户 MUST NOT 看到原始公式红字或普通文本残留

#### Scenario: standalone multi-equation line keeps display layout

- **WHEN** 正文中单独一行包含多个 LaTeX 公式片段或 `\\qquad` 等 display-style 分隔
- **THEN** 系统 MUST 保持该行为 display math
- **AND** 不得把该行强行挤进普通段落 inline 流

### Requirement: Standalone Single-Line `$$...$$` MUST Render As Display Math In Message Markdown

消息区 Markdown 对正文中的单独单行 `$$...$$` MUST 视为 display math，而不是普通段落里的 inline math。

#### Scenario: single-line double-dollar block becomes display math

- **WHEN** 正文中存在单独成行的 `$$\\hat{R}(f)=...$$`
- **THEN** 系统 MUST 以 display math 方式渲染该公式
- **AND** 该公式 MUST 与前后正文保持独立块级阅读布局

### Requirement: Existing Latex Fenced Block Experience MUST Remain Backward Compatible

本次消息区正文 LaTeX 兼容性修复 MUST 不回退既有 `latex/tex` fenced block 预览与复制体验。

#### Scenario: latex fenced block still renders preview cards

- **WHEN** 用户消息包含 ` ```latex ` 或 ` ```tex ` fenced block
- **THEN** 系统 MUST 继续渲染专用 latex preview block
- **AND** 复制原文与围栏复制能力 MUST 保持可用

### Requirement: Display Math Delimiter Normalization MUST Preserve Markdown Container Boundaries

消息区在把显式 `\\[...\\]` display delimiters 适配为 `remark-math` 支持的内部表示时，MUST 保留公式所在的 Markdown container boundary，且 MUST NOT 改写 canonical message source。

#### Scenario: ordered-list display block keeps one container prefix

- **WHEN** ordered list item 的 continuation lines 包含独占一行的 `\\[`、formula body 与 `\\]`
- **THEN** normalization MUST 让 opening delimiter、formula body 与 closing delimiter 保持在同一 list container
- **AND** formula MUST 渲染为 display math
- **AND** 后续 prose MUST remain outside the math node
- **AND** render output MUST NOT contain `.katex-error` caused by delimiter cross-pairing

#### Scenario: blockquote or nested container remains structurally stable

- **WHEN** standalone display delimiters 位于 whitespace/blockquote container prefix 内
- **THEN** normalization MUST preserve the exact delimiter-line container prefix
- **AND** normalization MUST NOT flatten the formula block to the document root

#### Scenario: unmatched delimiter remains non-destructive

- **WHEN** standalone opening delimiter 没有兼容的 closing delimiter
- **THEN** the line-aware normalization pass MUST leave that candidate unchanged
- **AND** it MUST NOT consume subsequent prose as a synthesized math block

#### Scenario: file-preview source mapping remains stable

- **WHEN** shared Markdown normalization processes a matched standalone display block
- **THEN** normalized line count MUST equal source line count
- **AND** file-preview `lineMap` MUST continue to map every normalized line to its original source line

### Requirement: Established Math Ranges MUST NOT Be Wrapped Again

一旦 normalization 已经建立 `$...$` 或 `$$...$$` math range，后续 compatibility heuristic MUST treat its body as math content and MUST NOT inject nested dollar delimiters。

#### Scenario: parenthesized LaTeX inside display math is not wrapped again

- **WHEN** standalone `\\[...\\]` display body 以 `(\\theta,t_x,t_y)` 或等价 parenthesized LaTeX 开头
- **THEN** normalization MUST preserve the parentheses as part of the display expression
- **AND** plain-parentheses heuristic MUST NOT insert nested single-dollar delimiters inside the display math range
- **AND** render output MUST NOT contain a `.katex-error` caused by literal `$` in math mode

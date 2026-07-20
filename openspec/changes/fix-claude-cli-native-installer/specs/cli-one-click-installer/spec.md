## MODIFIED Requirements

### Requirement: Installer Backend MUST Enforce Command Whitelist

#### Scenario: phase one command matrix is bounded

- **WHEN** backend 构造 installer command
- **THEN** Codex / Kimi install/update/uninstall MUST 使用 npm global strategy 安装或卸载官方 package
- **AND** Claude Code installLatest MUST 使用官方 native installer：
  - macOS / Linux / WSL: `curl -fsSL https://claude.ai/install.sh | bash`
  - Windows: `irm https://claude.ai/install.ps1 | iex`
- **AND** Claude Code updateLatest MUST 使用 `claude update`（`cliSelfUpdate` strategy）
- **AND** Claude Code uninstall MUST 仅删除官方 native 安装路径（`~/.local/bin/claude` 与 `~/.local/share/claude`，Windows 对应 `%USERPROFILE%\.local\...`）
- **AND** Codex / Kimi MUST NOT 执行 CLI self-update commands such as `codex --upgrade`
- **AND** backend MUST 忽略 frontend 对 Claude 传入的过时 `npmGlobal` strategy，并改写为上述有效 strategy

### Requirement: CLI Validation MUST Offer Bounded Installer Actions For Codex And Claude

#### Scenario: Claude install action is offered after missing doctor

- **WHEN** 用户在 Claude Code tab 运行 doctor
- **AND** doctor 结果显示 Claude CLI 不可用
- **AND** installer preflight 判断平台支持官方 native installer（macOS/Linux 需 `/bin/bash`，Windows 需 PowerShell）
- **THEN** 系统 MUST 提供 “安装最新版” 操作
- **AND** 操作 MUST 通过 backend installer command 执行，而不是 frontend 拼接 shell
- **AND** Claude install MUST NOT 将 Node/npm 缺失视为 blocker

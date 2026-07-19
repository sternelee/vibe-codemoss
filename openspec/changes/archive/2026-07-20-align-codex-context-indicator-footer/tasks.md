## 1. Footer Presentation

- [x] 1.1 [P0, depends: none] 输入现有 `resolvedDualContextUsage` 与 Codex compaction callbacks，在 `Composer` canonical footer usage slot 输出原 `ContextBar` summary；验证 Codex indicator 不再出现在输入框内部且 Claude path 不变。
- [x] 1.2 [P0, depends: 1.1] 输入现有 ai-elements ring percent，输出 Claude/Codex 共用的 SVG ring primitive 与 footer-scoped percentage-first styling；验证尺寸、stroke、顺序、间距和 theme token 一致。
- [x] 1.3 [P1, depends: 1.1] 移除 `ChatInputBox` / adapter 中已无消费点的 dual usage presentation props；以 `rg` caller audit 和 `npm run typecheck` 验证无断链。

## 2. Regression Verification

- [x] 2.1 [P0, depends: 1.1-1.3] 更新 Composer、ContextBar、TokenIndicator focused tests；验证 footer placement、shared ring、Codex tooltip/compaction controls 与 non-Codex boundary。
- [x] 2.2 [P0, depends: 2.1] 运行 focused Vitest、scoped ESLint、`npm run typecheck` 与 `openspec validate align-codex-context-indicator-footer --strict --no-interactive`，输出通过证据。
- [x] 2.3 [P1, depends: 2.2] 在 light theme 对照 Codex/Claude Code Composer，验证输入框下方右侧位置、percentage-first 排版、圆环外观及 tooltip 向上展开。

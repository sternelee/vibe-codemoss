## 1. Stable author palette mapping

- [x] 1.1 [P0][depends:none][I: `authorEmail`, `author`][O: normalized identity maps deterministically to one of eight palette slots, with slot `0` as empty-identity fallback][V: focused utility Vitest] 实现无依赖的 author color slot helper。
- [x] 1.2 [P0][depends:1.1][I: casing/whitespace variants, missing email/name, distinct identities][O: same identity is stable and known distinct fixtures occupy different slots][V: `npx vitest run <utility-test>`] 固化 normalization、fallback 与 deterministic mapping 回归。

## 2. Commit timeline projection

- [x] 2.1 [P0][depends:1.1][I: virtualized `GitHistoryPanelView` commit entries][O: each rendered row carries its deterministic author palette class without state or discovery-order coupling][V: focused `GitHistoryPanel.test.tsx` assertions] 将 author slot 投影到 commit row。
- [x] 2.2 [P0][depends:2.1][I: row palette class][O: graph dot uses author accent, line uses subdued accent, author label uses theme-mixed readable accent; selection background remains unchanged][V: CSS selector audit + focused component test] 增强 timeline 与 author metadata 色彩。

## 3. Verification

- [x] 3.1 [P0][depends:1.2,2.2][I: implementation and tests][O: focused tests, typecheck, lint and large-file gate pass][V: repository commands] 执行前端质量门禁并修复回归。
- [x] 3.2 [P0][depends:3.1][I: completed change artifacts and implementation][O: implementation aligns with delta spec/design and strict validation passes][V: `openspec validate enhance-git-history-author-timeline-colors --strict --no-interactive`] 执行 OpenSpec verify。

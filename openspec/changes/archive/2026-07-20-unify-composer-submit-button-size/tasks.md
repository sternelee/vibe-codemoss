## 1. UI Geometry

- [x] 1.1 [P1, depends: none] 将 `src/styles/home-chat.css` 的 narrow Home submit action 从 `36px` 收敛为 canonical `30px`；输出为仅限 geometry 的 CSS diff，人工检查颜色与交互规则未改。

## 2. Regression Guard

- [x] 2.1 [P1, depends: 1.1] 更新 `HomeChat.styles.test.ts`，断言 Home default 与 narrow responsive submit action 均为 `30px × 30px`；运行 focused Vitest。

## 3. Verification

- [x] 3.1 [P1, depends: 2.1] 运行 OpenSpec strict validation、TypeScript typecheck 与 large-file gate，并复核 diff 不包含无关功能改动。

## 4. Compact Follow-up

- [x] 4.1 [P1, depends: 3.1] 将 shared send/stop action 从 `30px` 缩至 `26px`，ArrowUp 从 `16px` 缩至 `14px`，stop icon 从 `11px` 缩至 `10px`，radius 从 `10px` 缩至 `8px`。
- [x] 4.2 [P1, depends: 4.1] 更新 shared 与 Home focused CSS contract tests，锁定 `26px` geometry 且 Home 不得重新覆盖尺寸。
- [x] 4.3 [P1, depends: 4.2] 运行 focused Vitest、ESLint、TypeScript typecheck、large-file gate 与 OpenSpec strict validation，并复核仅包含 UI geometry。

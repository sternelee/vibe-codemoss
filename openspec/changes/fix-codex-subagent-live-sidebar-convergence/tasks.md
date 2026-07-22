## 1. Behavior Contract

- [x] 1.1 记录 live `thread/started` relationship-safe first projection requirement。

## 2. RED Regression

- [x] 2.1 添加 full Codex child notification 的 hook/reducer RED test。

## 3. Implementation

- [x] 3.1 在 `onThreadStarted` normalize live parent/nickname metadata。
- [x] 3.2 扩展 `ensureThread` atomic metadata merge，并保持 no-op guard。

## 4. Verification

- [x] 4.1 运行 focused tests、typecheck、lint、runtime contracts 与 strict OpenSpec validation。

## 5. Review

- [x] 5.1 审查 diff、记录 verification evidence 与 remaining risks。

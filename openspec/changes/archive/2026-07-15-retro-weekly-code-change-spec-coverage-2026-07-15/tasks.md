## 1. Weekly Change Audit

- [x] 1.1 [P0, 无依赖] 输入 2026-07-09 至 2026-07-15 Git history；去除 merge/metadata 重复并识别 64 个 code/build commits；输出 normalized behavior groups
- [x] 1.2 [P0, 依赖 1.1] 输入 active/archive changes 与 main specs；将 behavior groups 分类为 direct tracked、existing tracked、retrospective backfill、non-behavior maintenance；输出 coverage matrix

## 2. Retrospective Contracts

- [x] 2.1 [P0, 依赖 1.2] 输入缺失 behavior groups；创建 proposal/design 与 11 个 capability deltas；输出可同步 retrospective artifacts
- [x] 2.2 [P0, 依赖 2.1] 输入 coverage matrix；生成 `openspec/docs/weekly-code-change-openspec-audit-2026-07-15.md`；验证 commit 与 capability 引用可追溯

## 3. Sync And Closure

- [x] 3.1 [P0, 依赖 2.2] 输入 retrospective deltas 与已完成 active changes；同步 main specs；验证 delta intent 已合并
- [x] 3.2 [P0, 依赖 3.1] 输入 tasks 全完成的 active changes；归档 eligible changes；验证未完成 changes 保持 active
- [x] 3.3 [P1, 依赖 3.2] 输入归档后文件系统 inventory；更新 `openspec/project.md`；验证 snapshot 数字一致
- [x] 3.4 [P0, 依赖 3.3] 运行 strict validation、consistency check 与 `git diff --check`；输出 0 failure closure evidence

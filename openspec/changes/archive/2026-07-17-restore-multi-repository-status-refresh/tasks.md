## 1. Multi-repository refresh UI

- [x] 1.1 [P0][依赖:无][输入:`GitMultiRepositoryChanges` existing `onRefresh` / `isLoading` props][输出:每个 repository header 的 accessible refresh button 与 aggregate loading guard][验证:focused component test 可定位按钮并触发 callback]
- [x] 1.2 [P0][依赖:1.1][输入:现有 `.git-status-refresh-button` visual contract][输出:header hover/focus reveal、spinning/disabled state 与 narrow layout stability][验证:CSS contract review + `git diff --check`]

## 2. Regression coverage and verification

- [x] 2.1 [P0][依赖:1.1,1.2][输入:multi-repository component fixture][输出:每仓入口、aggregate callback、loading duplicate guard tests][验证:`npx vitest run src/features/git/components/GitMultiRepositoryChanges.test.tsx`]
- [x] 2.2 [P0][依赖:2.1][输入:全部变更][输出:通过 TypeScript 与 OpenSpec gates][验证:`npm run typecheck`、`openspec validate restore-multi-repository-status-refresh --strict --no-interactive`、`git diff --check`]

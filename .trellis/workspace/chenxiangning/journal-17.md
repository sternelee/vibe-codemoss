# Journal - chenxiangning (Part 17)

> Continuation from `journal-16.md` (archived at ~2000 lines)
> Started: 2026-05-27

---



## Session 607: Project Map 节点拖拽与重复节点修复

**Date**: 2026-05-27
**Task**: Project Map 节点拖拽与重复节点修复
**Branch**: `feature/v0.5.3`

### Summary

(Add summary)

### Main Changes

本轮完成 Project Map 画布交互与数据归一化收口：
- 修复节点本体 pointer capture 后 move/up 落在 node 上时拖拽 preview 和持久化不触发的问题。
- 强化总览 Root 节点视觉层级，使用更明显的尺寸、蓝色 anchor border、halo 和 badge。
- 修复同一 ProjectMapNode.id 跨多个 lens payload 重复出现导致 graph 渲染多个相同节点的问题，在 topology normalization 层按稳定 id 去重并合并 topology/evidence。
- 更新 OpenSpec change improve-project-map-drag-and-root-visual 的 proposal/design/tasks/spec。

验证：
- npm exec vitest -- run src/features/project-map/components/ProjectMapPanel.test.tsx --maxWorkers 1 --minWorkers 1：28 passed。
- npm exec vitest -- run src/features/project-map/services/projectMapPersistence.test.ts src/features/project-map/utils/incrementalGeneration.test.ts --maxWorkers 1 --minWorkers 1：20 passed。
- openspec validate improve-project-map-drag-and-root-visual --strict：passed。
- npm run typecheck：passed。
- npm run lint：passed。
- npm run check:large-files：found=0。
- git diff --check：passed。


### Git Commits

| Hash | Message |
|------|---------|
| `ced4bf9e` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete

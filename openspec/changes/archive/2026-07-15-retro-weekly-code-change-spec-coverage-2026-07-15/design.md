## Context

本次是 code-after-spec 的治理修复。审计窗口包含 merge、release automation、Trellis metadata、纯 refactor 和多个连续 fix；Git commit 不是 behavior capability 的稳定边界。已有 change 也可能在不同提交中先后补 proposal、implementation 与 verification，因此不能仅以“同提交是否修改 `openspec/**`”判断缺失。

## Goals / Non-Goals

**Goals:**

- 使用可复查规则把 weekly commits 分类为 direct tracked、existing tracked、retrospective backfill、non-behavior maintenance。
- 用最少的新 capability 覆盖真实 contract 缺口，并复用已有 main specs。
- 保持 sync/archive 可幂等执行，更新项目 snapshot 后数字与文件系统一致。

**Non-Goals:**

- 不重新评审或修改实现。
- 不为 refactor、lockfile、version bump 创建虚假 behavior requirement。
- 不清理与本次审计无关的 legacy spec format warnings。

## Decisions

### Decision 1: 按 behavior group 聚合 commit

连续 feature/fix（例如 Terminal handoff + duplicate prevention）共享一个 capability。相比 commit-per-proposal，这能保留用户意图和 regression boundary；commit hash 仍在 audit report 中逐项留痕。

### Decision 2: existing capability 优先于新 namespace

已有 main spec 能承载新边界时，仅新增 requirement；只有语言支持、Terminal handoff、session display、Codex catalog coverage、scrollbar consistency 没有清晰 owner 时才新增 capability。

### Decision 3: 归档 gate 使用 task completion，不使用 artifact completion

OpenSpec `isComplete` 只表示 artifacts 齐全，不代表 implementation tasks 完成。本轮只归档 `tasks.md` 至少有一个 `- [x]` 且不存在 `- [ ]` 的 active change。

### Decision 4: project snapshot 从文件系统重新计算

`active`、`archive`、`main specs` 数字在归档完成后用目录数量计算；`project.md` 不沿用旧快照做算术推测。

## Risks / Trade-offs

- [Risk] 一个 weekly retrospective change 涵盖多个 domain，archive 较宽。→ Mitigation：delta 仍按 capability 分文件，audit report 按 behavior group 列 commit 和判断依据。
- [Risk] 已有 active proposal 与本次 backfill 边界重叠。→ Mitigation：已有 proposal 明确覆盖的提交只记为 existing tracked，不重复写 delta。
- [Risk] legacy consistency checker 仍输出大量 title-format warnings。→ Mitigation：记录 baseline 为 0 errors，不扩大范围改写 300+ 历史 specs。

## Migration Plan

1. 创建 retrospective artifacts 与 audit report。
2. strict validate retrospective change。
3. sync retrospective delta 和完成态 active changes 到 main specs。
4. 归档完成态 changes，重算 inventory 并更新 `project.md`。
5. strict validate all 与 consistency check。

Rollback：恢复 `openspec/specs/**`、`openspec/project.md` 到同步前版本，移回归档目录并删除 retrospective report/change；不涉及 product data migration。

## Open Questions

无。未来 weekly audit 是否自动化另开 governance change，本次不增加脚本。

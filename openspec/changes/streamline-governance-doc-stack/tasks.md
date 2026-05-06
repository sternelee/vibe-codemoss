## 1. Artifact completion

- [x] 1.1 Draft governance consolidation proposal covering `.omx/**` cleanup, `.gitignore` protection, and instruction-layer ownership.
- [x] 1.2 Write technical design for the five-layer model, migration plan, and rollback boundaries.
- [x] 1.3 Add spec deltas for instruction layering, runtime artifact hygiene, and OpenSpec README/project boundary.

## 2. Runtime artifact cleanup

- [x] 2.1 Remove committed `.omx/**` runtime artifacts from the repository without migrating them into long-lived governance folders.
- [x] 2.2 Add `.omx/` to `.gitignore` and keep existing local-only state rules intact.

## 3. Instruction chain refactor

- [x] 3.1 Streamline `AGENTS.md` into a short project entrypoint with rule priority, layer ownership, minimal session-start path, and global gates only.
- [x] 3.2 Refactor `openspec/README.md` into a concise navigation entry and point detailed governance readers to `openspec/project.md`.
- [x] 3.3 Refresh `openspec/project.md` where needed so it remains the single detailed OpenSpec governance overview after README slimming.

## 4. Validation

- [x] 4.1 Run `openspec status --change streamline-governance-doc-stack --json` and confirm proposal/design/specs/tasks are complete.
- [x] 4.2 Run `openspec validate streamline-governance-doc-stack --strict` or the closest available strict validation command and capture results.
- [x] 4.3 Review the final diff to confirm all tracked `.omx/**` files are marked for removal and no new duplicated governance正文 was introduced.

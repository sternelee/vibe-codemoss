## 1. 原生语言选择器

- [x] 1.1 [P0, 无依赖] 输入两版 Radix 实机失败证据；撤回 popper workaround；输出无残留共享组件修改的基线
- [x] 1.2 [P0, 依赖 1.1] 输入现有语言列表与 handler；替换为受控原生 `<select>` / `<option>`；输出无 Portal 的语言选择器
- [x] 1.3 [P1, 依赖 1.2] 输入设置页既有 select tokens；增加语言控件尺寸样式；输出与当前外观区域一致的原生控件
- [x] 1.4 [P0, 依赖 1.2] 输入组件 test harness；验证当前值、10 options、无 popup、change 与 persistence；输出 focused Vitest regression coverage
- [x] 1.5 [P1, 依赖 1.3] 输入设置页 theme tokens；重构 native select closed state、Lucide Chevron、hover 与 focus-visible；输出不改变原生菜单行为的精致控件

## 2. 回归验证

- [x] 2.1 [P0, 依赖 1.4] 运行 focused Vitest、ESLint、`npm run typecheck` 与 `git diff --check`；输出自动化门禁结果
- [x] 2.2 [P1, 依赖 2.1] 运行 OpenSpec strict validation；输出 native select contract 校验结果
- [x] 2.3 [P0, 依赖 2.1] 确认开发版 HMR 已加载原生控件；输出供用户按 100%、110%、111%、120% 验收的测试入口，不操作客户端进程
- [x] 2.4 [P0, 依赖 1.5] 运行视觉重构后的 focused Vitest、ESLint、TypeScript、CSS token scan 与 OpenSpec strict validation；输出完整门禁结果

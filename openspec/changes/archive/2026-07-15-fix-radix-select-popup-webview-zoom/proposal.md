## Why

语言选择器使用 Radix Select 时，在 macOS `WKWebView` 经 `setPageZoom` 设置为大于 100% 后，会出现纵贯视口的空白弹层、选项不可见或滚动箭头位置错误。实机验证表明 `item-aligned` 与 `popper` 两种定位模式均受影响，因此需要移除该入口对 Portal 和 JavaScript 浮层坐标计算的依赖。

## 目标与边界

- 让语言选择器在 100% 及更高 UI Scale 下稳定显示系统选项菜单。
- 保留当前语言解析、切换、持久化和全部 10 个语言选项。
- 将改动限定在语言选择器，不改变其他 Select。

## 非目标

- 不修改全局 `setPageZoom`、语言数据或 i18n contract。
- 不修改共享 Radix Select 的默认行为。
- 不引入第三方组件或自制浮层定位算法。

## What Changes

- 将语言选择器从 Radix Select 替换为原生 HTML `<select>` / `<option>`。
- 使用设置页既有 `.settings-select` 样式体系，以 CSS `appearance: none` 和非交互 Lucide Chevron 统一关闭状态视觉，同时保留原生菜单行为。
- 增加测试覆盖当前值、10 个选项、无 Radix Portal、语言切换与持久化。

## 方案取舍

- **方案 A：原生 HTML Select（采用）**。菜单由 WebKit/macOS form control 渲染，不创建 React Portal，也不依赖缩放后的 DOM 坐标；仓库已有大量同类实现，无新增依赖。
- **方案 B：Radix popper（已验证无效）**。实机仍出现视口级空白弹层。
- **方案 C：自定义 inline listbox（不采用）**。需要重新实现 keyboard navigation、focus management 和 accessibility，复杂度不合理。

## Capabilities

### New Capabilities

- `language-select-webview-zoom-compatibility`: 约束语言选择器在 WebView UI Scale 下使用无 Portal 的原生选择能力。

### Modified Capabilities

<!-- 无现有 behavior spec 需要修改。 -->

## 验收标准

- 100%、110%、111%、120% UI Scale 下打开语言选择器，不出现页面级空白浮层。
- 原生控件展示全部 10 个语言选项，并保持切换和持久化行为。
- 关闭状态与设置页控件保持一致，具备明确的 hover、focus-visible 和 dark theme 状态。
- DOM 中不创建 Radix select popup / popper wrapper。
- focused Vitest、ESLint、TypeScript 与 OpenSpec strict validation 通过。

## Impact

- Affected: `LanguageSelector.tsx`、对应测试、设置页语言控件 CSS。
- Shared component API / dependency / storage / IPC: 无变化。

## Context

Radix Select 的 item-aligned 和 popper 都通过 Portal 把弹层挂到 `<body>`，并依赖 trigger 几何信息计算浮层位置。用户在多个大于 100% 的 App UI Scale 下稳定复现异常；先后移除内部 `h-full`、切换 popper 均未解决，证明继续调整 Radix 高度或定位参数不能建立可靠契约。

设置模块已有大量原生 `<select className="settings-select">`。原生 select 的菜单不需要应用代码创建 Portal、fixed wrapper 或滚动箭头，适合有限且静态的语言选项集合。

## Goals / Non-Goals

**Goals:**

- 删除语言入口的浮层几何计算链。
- 复用既有 native select 样式和语义。
- 保持当前业务 handler 不变。

**Non-Goals:**

- 不全局替换 Radix Select。
- 不改变 UI Scale 实现。
- 不手写 dropdown / listbox。

## Decisions

### 使用原生 select 作为兼容边界

`LanguageSelector` 直接渲染受控 `<select>`，`value` 使用 `resolveCurrentLanguage()`，`onChange` 继续调用既有 handler。每个 `SUPPORTED_LANGUAGES` entry 映射为 `<option>`。

Alternative：继续约束 Radix Content 的 `max-height` 或 `position`。两条定位路径均已实机失败，继续修补无法消除 Portal 坐标系统风险。

### 复用 settings-select 样式

沿用 `.settings-select` 的 theme token、border 与 background，为语言控件覆盖 auto width、148px 最小宽度、36px 高度、hover 与 focus-visible。使用 `appearance: none` 仅重置关闭状态外观，并在 wrapper 内叠加 `pointer-events: none` 的 Lucide Chevron；真实 `<select>` 仍负责完整 hit area、keyboard interaction 和系统菜单。

Alternative：直接使用浏览器默认 appearance。行为稳定但与设置页现有控件边框、间距和图标语言不一致，因此只重置 closed control chrome，不替换原生 selection behavior。

## Risks / Trade-offs

- [Trade-off] 菜单视觉由系统决定，与 Radix popup 不完全一致 → 语言切换是低频设置项，兼容性和 accessibility 优先。
- [Risk] 原生控件宽度受最长 option 影响 → 使用 auto width 和 132px min-width，控制区继续右对齐。
- [Risk] JSDOM 不模拟 macOS 系统菜单 → 自动化测试证明无 Portal 和业务 contract，最终缩放矩阵由实机验收。

## Migration Plan

1. 删除语言入口的 Radix imports 和组件树。
2. 渲染原生 select 并复用既有 handler。
3. 更新 CSS、测试和 OpenSpec contract。
4. 通过 HMR 更新开发版，不操作用户客户端进程。
5. 回滚时恢复语言入口的 Radix 组件树即可，无数据迁移。

## Open Questions

- 无。

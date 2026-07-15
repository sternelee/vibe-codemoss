## ADDED Requirements

### Requirement: Language selector does not use a portaled popup

设置页语言选择器 MUST 使用原生 HTML select，并且 MUST NOT 创建依赖 JavaScript 几何计算的 Radix popup、fixed wrapper 或 popper wrapper。

#### Scenario: Open language selector above 100% UI Scale

- **WHEN** App UI Scale 为 110%、111%、120% 或其他大于 100% 的数值时用户打开语言选择器
- **THEN** WebKit/macOS MUST 展示原生选项菜单，应用页面不得出现纵贯视口的空白浮层

#### Scenario: Open language selector at 100% UI Scale

- **WHEN** App UI Scale 为 100% 时用户打开语言选择器
- **THEN** 系统 MUST 使用与高缩放相同的原生 select contract

### Requirement: Language selection behavior remains intact

原生控件 MUST 完整保留语言解析、选项渲染、语言切换与持久化行为。

#### Scenario: Render supported languages

- **WHEN** 语言选择器渲染
- **THEN** 系统 MUST 提供全部 10 个受支持语言 option，并选中当前解析后的语言

#### Scenario: Select another language

- **WHEN** 用户选择不同于当前语言的 option
- **THEN** 系统 MUST 调用既有 i18n language change 和 persistence 流程

### Requirement: Native select trigger matches settings controls

语言选择器关闭状态 MUST 使用设置页现有 theme tokens、稳定尺寸和清晰的交互状态，并且装饰图标 MUST NOT 接管 select 的 pointer 或 accessibility semantics。

#### Scenario: Hover or focus the language selector

- **WHEN** 用户 hover 或 keyboard focus 语言选择器
- **THEN** 控件 MUST 显示对应的 border、background 或 focus ring feedback，且布局不得移动

#### Scenario: Interact through the visual chevron area

- **WHEN** 用户点击右侧 Chevron 所在区域
- **THEN** 事件 MUST 继续由原生 select 接收，Chevron MUST 保持 `aria-hidden` 且不可拦截 pointer event

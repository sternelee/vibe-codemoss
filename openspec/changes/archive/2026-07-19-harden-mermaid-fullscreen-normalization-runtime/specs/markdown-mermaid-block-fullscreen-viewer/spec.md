## MODIFIED Requirements

### Requirement: Mermaid Fullscreen Viewer MUST Use Viewerjs Single-Image Configuration

`MermaidFullscreenViewer` MUST 使用 `viewerjs@^1.11.7` 的单图全屏配置：容器挂到 `document.body`，navbar / title 关闭，toolbar 严格配置为 8 个按钮（zoomIn / zoomOut / oneToOne / reset / rotateLeft / rotateRight / flipHorizontal / flipVertical），prev / next / play 显式置 false。toolbar 按钮位置 MUST 严格按 toolbar 对象 key 声明顺序展示（viewerjs 1.11.x ToolbarOption 不支持 5-9 的位置数字，只能按对象 key 升序排列）。Mermaid SVG 在进入 `<img>` 前 MUST 从 HTML-compatible markup 规范化为 XML-safe serialization，同时保持 strict sanitization；normalization MUST NOT 在 React render path 执行，且相同 component instance 的相同 SVG MUST 复用 bounded cached Data URL。

#### Scenario: 工具条按钮集合严格匹配 yn 单图用法

- **WHEN** `MermaidFullscreenViewer` 打开
- **THEN** viewerjs 实例 MUST 通过 `new Viewer(img, { container: document.body, inline: false, navbar: false, title: false, transition: !reducedMotion, toolbar: { zoomIn: true, zoomOut: true, oneToOne: true, reset: true, rotateLeft: true, rotateRight: true, flipHorizontal: true, flipVertical: true, prev: false, next: false, play: false } })` 创建
- **AND** 全屏 DOM 中 `.viewer-toolbar > ul` 的 `li` 子元素数量 MUST 等于 8
- **AND** toolbar 列表项中 MUST NOT 出现 prev / next / play 对应的 li
- **AND** toolbar 列表项位置顺序 MUST 与 toolbar 对象 key 声明顺序一致：zoomIn → zoomOut → oneToOne → reset → rotateLeft → rotateRight → flipHorizontal → flipVertical

#### Scenario: viewerjs 容器挂到 document.body 且 z-index 通过 CSS 变量暴露

- **WHEN** `MermaidFullscreenViewer` 打开
- **THEN** viewerjs 容器 MUST 是 `document.body` 的直接子节点
- **AND** viewerjs 容器 z-index MUST ≥ `var(--z-mermaid-fullscreen, 1300)`
- **AND** `--z-mermaid-fullscreen` MUST 定义于 `:root`，默认值为 1300（高于现有 `kanban.css: z-index: 1200` 留 100 buffer）
- **AND** viewerjs 容器 z-index MUST 高于项目内所有现有 z-index 硬编码值

#### Scenario: SVG 通过 XML-safe serialization 与 UTF-8 Base64 注入 img

- **WHEN** `MermaidFullscreenViewer` 收到非空 `svg` 字符串
- **THEN** viewerjs 持有的元素 MUST 是一个 `<img>` 标签
- **AND** Mermaid strict-sanitized SVG MUST 先通过 inert HTML parser 恢复 DOM namespace，再由 `XMLSerializer` 输出 XML-safe markup
- **AND** HTML void elements（包括 `<br>`、`<hr>`、`<img>`、`<input>`、`<wbr>`）MUST 在最终 SVG 中成为 XML-safe serialization
- **AND** HTML named entity（包括 `&nbsp;`）MUST NOT 以 XML 未定义 entity 留在最终 SVG 中
- **AND** `<img>` 的 `src` MUST 是 `data:image/svg+xml;base64,${base64(xmlSafeSvg)}` 形态
- **AND** `base64(xmlSafeSvg)` MUST 通过 `TextEncoder.encode(xmlSafeSvg)` → `btoa()` 流程生成（UTF-8 安全）
- **AND** `<img>` MUST 显式带 `alt=""` 与 `aria-hidden="true"`（a11y 装饰性图）
- **AND** viewerjs MUST NOT 直接接管 `<svg>` DOM 节点作为主路径
- **AND** 规范化环境能力缺失或无法取得 `<svg>` root 时 MUST 回退原始 SVG UTF-8 Base64 编码且不得抛出新异常
- **AND** serialization exception MUST 回退原始 SVG UTF-8 Base64、产生不包含 SVG source 的 diagnostic，并且不得向 caller 抛出

#### Scenario: Data URL normalization 离开 render 并按 SVG 复用

- **WHEN** fullscreen 以 SVG A 打开
- **THEN** React render MUST NOT 执行 `svgToDataUrl`
- **AND** viewer lifecycle effect MUST 在 `ViewerCtor` 绑定 `<img>` 前为其设置 SVG A 的 Data URL
- **AND** parent rerender 或关闭后 reopen SVG A MUST 复用 component-local cached Data URL
- **AND** cache MUST 只保留最近一个 SVG/Data URL entry
- **WHEN** 同一 component instance 随后打开 SVG B
- **THEN** lifecycle effect MUST 为 SVG B 恰好重新计算一次并覆盖旧 cache

#### Scenario: 含 XHTML 换行的流程图可全屏解码

- **WHEN** Mermaid flowchart node label 包含 `<br/>` 并在 strict sanitization 后输出 `<foreignObject>` XHTML
- **THEN** fullscreen Data URL MUST 可被 XML parser 接受
- **AND** `<img>` MUST 触发 load 而不是 error
- **AND** 截图对应的多节点流程图与小型含换行流程图 MUST 使用同一 normalization path

#### Scenario: Unicode label 在规范化后保持正确

- **WHEN** Mermaid SVG 包含中文、日文或 Emoji label
- **THEN** XML-safe serialization MUST 保留原字符
- **AND** UTF-8 Base64 decode 后 MUST 与 serialization 输入一致

#### Scenario: reduced-motion 用户群体不带过渡动画

- **WHEN** `window.matchMedia("(prefers-reduced-motion: reduce)").matches === true`
- **THEN** viewerjs options MUST 传 `transition: false`
- **WHEN** reduced-motion 未启用
- **THEN** viewerjs options MUST 传 `transition: true`（viewerjs 默认）

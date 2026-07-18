## Why

对话幕布与文件 Markdown 预览中的 Mermaid 图可以 inline 正常显示，但包含 HTML void elements（如 `<br>`、`<hr>`、`<img>`）或 XML 未定义 named entity（如 `&nbsp;`）时，全屏 viewer 会显示破图。根因是 Mermaid `securityLevel: "strict"` 的 DOMPurify 输出遵循 HTML serialization，而 viewerjs 通过 `<img src="data:image/svg+xml;base64,...">` 触发严格 XML parser，两条解析路径的 contract 不一致。

## 目标与边界

- 在共享 `svgToDataUrl` boundary 将 Mermaid HTML-compatible SVG 规范化为 XML-safe SVG，再执行现有 UTF-8 Base64 编码。
- 同时覆盖 messages 与 files 两个 Mermaid fullscreen surface。
- 保持 `securityLevel: "strict"`、viewerjs lifecycle、toolbar、主题和 inline rendering 行为不变。
- 用 focused regression 固化 void elements、named entity、Unicode 与空输入 contract。

## What Changes

- 修改 `svgToDataUrl`：通过 inert `<template>` 使用 HTML parser 恢复 DOM namespace，再使用 `XMLSerializer` 生成 XML-safe markup。
- 无法取得 `<svg>` root 时保留原始 SVG 编码路径，避免扩大既有 failure surface。
- 增加 serialization focused tests，验证 void elements 自闭合、named entity 消歧、Unicode 保真与空输入。
- 更新 `markdown-mermaid-block-fullscreen-viewer` capability 的 SVG 注入 requirement。

## 非目标

- 不关闭或降低 Mermaid `securityLevel: "strict"`。
- 不切换 `htmlLabels`，不改变 Mermaid inline 图形布局。
- 不用标签正则逐项修补 `<br>` / `<hr>` 等 HTML void elements。
- 不迁移到 Blob URL，不修改 viewerjs、普通图片全屏或样式。
- 不处理与本缺陷无关的极端 SVG 体积或 GPU texture 上限。

## 技术方案对比

### 方案 A：HTML parser + XMLSerializer（采用）

将 Mermaid 已经 strict-sanitize 的 SVG 放入 inert `<template>`，取出 `<svg>` 后用 `XMLSerializer` 序列化。浏览器负责 namespace、void element 与 entity 规范化，不维护手写标签清单；在 WKWebView 实测 `<br>`、`<hr>`、`<img>`、`<input>`、`<wbr>`、`&nbsp;` 和截图对应流程图均可作为 `<img>` 解码。

### 方案 B：只替换 `<br>`（拒绝）

改动最小，但只覆盖当前截图症状；其他 void elements 与 `&nbsp;` 仍会触发同类 XML parse error，属于 symptom patch。

### 方案 C：关闭 HTML labels 或降低 security level（拒绝）

`htmlLabels: false` 会改变节点布局和换行语义；`securityLevel: "loose"` 会扩大安全边界。两者都不是 serialization defect 的正确修复层级。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `markdown-mermaid-block-fullscreen-viewer`: 全屏 `<img>` MUST 消费 XML-safe serialization 后的 UTF-8 Base64 SVG，并保持 strict sanitization 与跨 surface 共享契约。

## Impact

- Frontend utility：`src/features/markdown/mermaidFullscreen/svgToDataUrl.ts`
- Focused tests：`src/features/markdown/mermaidFullscreen/svgToDataUrl.test.ts`
- Behavior spec：`openspec/specs/markdown-mermaid-block-fullscreen-viewer/spec.md`
- 无 API、Tauri command、storage schema、依赖或样式变更。

## 验收标准

- 含 `<br>`、`<hr>`、`<img>`、`<input>`、`<wbr>` 的 Mermaid XHTML label 序列化后可被 XML parser 接受。
- `&nbsp;` 不再以 XML 未定义 named entity 留在输出中。
- 中文、日文、Emoji 与现有 UTF-8 Base64 contract 保持正确。
- 空字符串继续返回空字符串；缺少 `<svg>` root 时不抛异常。
- 截图对应 Mermaid 流程图在 macOS WKWebView 全屏 `<img>` 中加载成功。
- focused Vitest、现有 Mermaid fullscreen tests、lint、typecheck 与 OpenSpec strict validation 通过。

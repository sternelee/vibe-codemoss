## Context

`MermaidBlock` 与 `FileMarkdownMermaidBlock` 都通过 `mermaid.render()` 获得 SVG string。inline surface 使用 `dangerouslySetInnerHTML`，由 HTML parser 解释 `<foreignObject>` 中的 XHTML；fullscreen surface 则由 `svgToDataUrl()` 直接 Base64 后交给 `<img>`，WebView 会将其作为 XML SVG image 解析。

Mermaid 11.12.2 在 `cleanUpSvgCode()` 中先把 `<br>` 改为 `<br/>`，但 `securityLevel: "strict"` 随后的 DOMPurify HTML serialization 会再次输出 `<br>`、`<hr>` 等 HTML void-element 形态，并可能保留 `&nbsp;`。这些内容在 inline HTML 中合法，在 XML image 中会触发 parse error。

## Goals / Non-Goals

**Goals:**

- 在共享 fullscreen serialization boundary 生成 XML-safe SVG。
- 覆盖所有 HTML void elements、named entities 与 XHTML namespace，而不是仅修 `<br>`。
- 保持 strict sanitization、UTF-8、viewerjs lifecycle 与两个 surface 的现有行为。
- 保持同步 helper contract，不引入 dependency 或 object URL lifecycle。

**Non-Goals:**

- 不修改 Mermaid 配置、renderer、inline DOM 或 viewerjs。
- 不降低 security level，不放宽 DOMPurify policy。
- 不处理普通图片或 SVG 极端体积限制。

## Decisions

### Decision 1: 使用 inert HTML parse + XMLSerializer

`svgToDataUrl()` 先创建 `<template>`，将 Mermaid SVG 写入 `template.innerHTML`，再从 `template.content` 取得 `<svg>` 并交给 `XMLSerializer`。

- `<template>` 是 inert container，不执行 SVG 内脚本。
- HTML parser 正确恢复 `<foreignObject>` 下 XHTML namespace 和 HTML void-element DOM semantics。
- `XMLSerializer` 将 DOM 输出为 XML-safe self-closing elements，并把 `&nbsp;` 消歧为 XML 可表达内容。
- 输入已经经过 Mermaid strict DOMPurify；该步骤只规范化 serialization，不扩大允许内容。

备选的 `<br>` regex 无法覆盖 `<hr>` / `<img>` / `<input>` / `<wbr>` / `&nbsp;`。切换 `htmlLabels` 或 `securityLevel` 会改变布局或安全 contract，因此拒绝。

### Decision 2: 规范化失败时保持原始编码路径

如果当前环境不存在 `document` / `XMLSerializer`，或 HTML parse 后找不到 `<svg>` root，helper 使用原始 SVG string 继续现有 UTF-8 Base64 编码。这样保持既有 API 与 failure semantics，不让 defensive normalization 变成新的 throw source。

### Decision 3: 保留 Data URL

Blob URL 能减少 Base64 膨胀，但需要跨 React/viewerjs clone lifecycle 管理 `revokeObjectURL()`，与本次 XML serialization defect 正交。现有 WKWebView 实测 47 KB、5091px 宽的无 HTML 图可正常加载，因此不扩展范围。

## Risks / Trade-offs

- [Risk] HTML parser 可能调整属性顺序或补 namespace → Viewerjs 只依赖最终 image decode；focused tests 验证 XML parse 与 UTF-8 内容，不锁定无意义的完整字符串顺序。
- [Risk] `document` 在非浏览器测试或 SSR 不存在 → helper feature-detect 并回退原始编码。
- [Risk] Mermaid 后续版本修复 DOMPurify 顺序 → normalization 保持幂等；合法 XML SVG 经 parse/serialize 后仍是合法 XML。
- [Risk] `<template>.innerHTML` 处理 untrusted markup → 输入已 strict-sanitize，template inert，且不会挂载到 live DOM。

## Migration Plan

1. 修改共享 helper 并添加 focused tests。
2. 运行现有 Mermaid fullscreen regression、lint 与 typecheck。
3. 用截图对应流程图执行 WKWebView image decode smoke。
4. 无数据迁移；回滚时撤销 helper normalization 与测试即可。

## Open Questions

无。实现边界与验证矩阵已通过本机 Mermaid 11.12.2 + WKWebView 实验确认。

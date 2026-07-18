# 修复 Mermaid 全屏 SVG Serialization

## Goal

修复对话幕布与文件 Markdown 预览中 Mermaid inline 正常、全屏 `<img>` 因 HTML-compatible SVG 不满足 XML parser 而显示破图的问题。

关联 OpenSpec change：`fix-mermaid-fullscreen-svg-serialization`

## Requirements

- 在共享 `svgToDataUrl` boundary 通过 inert HTML parse + `XMLSerializer` 生成 XML-safe SVG。
- 覆盖 HTML void elements、`&nbsp;` 与 Unicode，不写 `<br>` 单点正则。
- 保持 Mermaid `securityLevel: "strict"`、viewerjs lifecycle、Data URL、inline renderer 与普通图片链路不变。
- normalization 能力缺失或找不到 `<svg>` root 时保持原始 UTF-8 Base64 fallback。

## Acceptance Criteria

- [ ] void elements 与 `&nbsp;` 生成的 Data URL 可被 XML parser 接受。
- [ ] 中文、日文、Emoji Base64 round-trip 正确。
- [ ] 空输入与无 `<svg>` root 不抛异常。
- [ ] 截图对应 Mermaid 流程图在 WKWebView `<img>` 中触发 load。
- [ ] focused tests、现有 fullscreen tests、lint、typecheck 与 OpenSpec strict validation 通过。
- [ ] Delta spec 同步到 main spec，change 完成归档。

## Technical Notes

- Primary implementation：`src/features/markdown/mermaidFullscreen/svgToDataUrl.ts`
- Primary test：`src/features/markdown/mermaidFullscreen/svgToDataUrl.test.ts`
- Behavior source of truth：`openspec/changes/fix-mermaid-fullscreen-svg-serialization/`
- 不涉及 backend、Tauri command、storage schema 或 dependency 变更。

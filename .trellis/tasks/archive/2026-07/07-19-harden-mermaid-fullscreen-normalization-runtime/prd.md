# Mermaid 全屏 Normalization Runtime 加固

## Goal

将 Mermaid fullscreen SVG normalization 移出 React render，通过 component-local single-entry cache 避免相同 SVG 重算，并让 serialization exception fallback 可诊断。

关联 OpenSpec change：`harden-mermaid-fullscreen-normalization-runtime`

## Requirements

- `svgToDataUrl` 只在现有 viewer lifecycle effect 中按需调用。
- Viewer constructor 绑定 `<img>` 前必须已设置 Data URL。
- parent rerender 与 reopen 同一 SVG 复用最近 cache；SVG 变化重新计算并覆盖旧 entry。
- cache 保持 component-local、single-entry，不新增全局或 unbounded state。
- serialization exception 保持原 SVG Base64 fallback，并输出不含 SVG source/error message 的 diagnostic。
- Mermaid XML-safe algorithm、strict sanitization、viewerjs options 与 singleton lifecycle 保持不变。

## Acceptance Criteria

- [ ] render path 不调用 `svgToDataUrl`。
- [ ] 同一 SVG rerender/reopen 只转换一次，replacement SVG 恰好重算一次。
- [ ] Viewer constructor 观察到非空 Data URL。
- [ ] throwing `XMLSerializer` 不向 caller 抛出，warning 不包含 SVG source。
- [ ] focused tests、lint、typecheck、OpenSpec strict validation 通过。
- [ ] Delta spec 同步 main spec，OpenSpec change 与 Trellis task 完成归档。

## Technical Notes

- Primary component：`src/features/markdown/mermaidFullscreen/MermaidFullscreenViewer.tsx`
- Primary utility：`src/features/markdown/mermaidFullscreen/svgToDataUrl.ts`
- Behavior source：`openspec/changes/harden-mermaid-fullscreen-normalization-runtime/`
- 不涉及 backend、storage schema、dependency 或 Settings UI。

## Context

`MermaidFullscreenViewer` 当前在 JSX 中调用 `svgToDataUrl(svg)`。XML-safe fix 引入 inert HTML parse、namespace cleanup 与 `XMLSerializer` 后，该调用从轻量 encoding 变成同步 O(n) DOM work；messages / files surface 的父层 rerender 会重复执行相同输入。与此同时，`serializeSvgForImage` catch 直接返回原 SVG，兼容性得以保留，但异常不可追踪。

约束：

- viewerjs constructor 前必须拿到已经设置 Data URL 的 `<img>`。
- `open/svg` effect 已具备 cancellation 与 singleton lifecycle，新增工作不能形成第二套 orchestration。
- cache 必须有界，不能把对话内所有 SVG / Data URL 长期保存在 module scope。
- diagnostic 不能记录 SVG source、label 或其他可能包含用户内容的 payload。

## Goals / Non-Goals

**Goals:**

- render path 不执行 DOM parse / XML serialization / Base64 encoding。
- 同一 component instance 的相同 SVG 在 rerender 与 reopen 中复用最近 Data URL。
- SVG replacement、StrictMode cancellation 与 cross-surface singleton 保持正确。
- exception fallback 可诊断且不泄露 SVG 内容。

**Non-Goals:**

- 不改变 Mermaid security level、sanitization、SVG normalization algorithm 或 viewerjs options。
- 不建立 global LRU、不异步化到 Worker、不引入 persistence。
- 不承诺首次新 SVG normalization 为零成本；本次保证其离开 render 且不重复。

## Decisions

### 1. 在 existing viewer effect 内计算并注入 `img.src`

Portal render 只创建无 `src` 的装饰性 `<img>`。`preloadViewerjs()` settle 且 cancellation guard 通过后，effect 取得 `imgRef.current`，从 cache 读取或调用 `svgToDataUrl(svg)`，设置 `image.src`，然后才构造 `ViewerCtor(image, options)`。

这样复用现有 `open/svg` lifecycle：parent rerender 不重跑 effect，dependency 变化会先 cleanup/cancel old run，Viewer constructor 始终观察到完整 `src`。

备选 `useMemo` 被拒绝，因为 expensive derive 仍发生在 React render；独立 effect/state 被拒绝，因为会增加一次 render 和 viewer/source race。

### 2. 使用 component-local single-entry ref cache

cache shape 为 `{ svg: string; dataUrl: string } | null`。effect 仅在 key 不匹配时转换；关闭不清 cache，因此 reopen 同一 SVG 可复用；新 SVG 覆盖旧 entry。

这比 module-level Map 更符合 singleton viewer 的实际访问模式，并将 retained memory 上限固定为一份 SVG key 与一份 Data URL。

### 3. serialization exception 使用 content-free `console.warn`

catch 继续返回原 SVG，保持 fail-soft contract；同时输出稳定 diagnostic code 与低敏 metadata（error name/type、SVG length），不输出 error message 或 SVG source，避免异常对象意外携带用户内容。

选择 `console.warn` 是因为该 pure frontend utility 不持有 app debug hook，直接接入 persisted client error log 会引入跨层依赖与 async side effect。cache 会抑制 viewer 正常路径上的重复 warning。

## Risks / Trade-offs

- [首次打开超大且 XML-invalid SVG 仍可能占用主线程] → work 已移出 render 且每个 SVG 仅做一次；若 WebKit profiling 仍超预算，再独立评估 idle precompute，不在本 change 过度设计。
- [无 `src` 的 portal `<img>` 短暂存在] → effect 在 Viewer constructor 前同步设置 property；viewerjs 永远不会绑定空 source。
- [StrictMode effect replay] → existing `cancelled` guard 在 conversion 前检查；component cache 使第二次 effective run 可复用结果。
- [console warning 噪声] → 只在真实 exception 触发，metadata 不含 source，正常 unsupported-environment / missing-root fallback 不 warning。

## Migration Plan

1. 更新 delta spec 与 focused tests。
2. 修改 viewer lifecycle 与 serializer diagnostic。
3. 运行 focused Vitest、lint、typecheck、strict OpenSpec validation。
4. 同步 main spec 并归档 change。

Rollback：回退 Viewer、serializer、tests 与 spec delta；无数据或配置迁移。

## Open Questions

无。首次新 SVG 的 WebKit latency 作为后续 profiling 信号，不阻塞本次 bounded reuse fix。

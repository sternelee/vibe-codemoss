# Desktop Drag-Drop Contract

本规范固化桌面端外部文件/文件夹拖入 Composer 的跨层契约，适用于 Tauri 2 + React 前端、主 `WebviewWindow` 与 Browser Agent child WebView 并存的场景。

## Scenario: External file-system drag-drop reaches Composer across multiple WebViews

### 1. Scope / Trigger

- Trigger：修改 `src-tauri/src/lib.rs` 的 window/webview builder、`src-tauri/src/browser_agent/**` child WebView 生命周期、`src/services/dragDrop.ts`、`ChatInputBox` paste/drop hook，或新增会覆盖主窗口的 native WebView。
- 目标：保证 macOS Finder、Windows Explorer、Linux file manager 拖入文件/文件夹时，Composer 仍能通过同一 file-reference pipeline 插入绝对路径。
- 风险：Tauri/Wry 的 drag-drop event 按 WebView label 分发；如果 child WebView 截获 OS drop，main WebView 的 `getCurrentWindow().onDragDropEvent` 不会收到该事件。

### 2. Signatures

Rust forwarded event:

```rust
const MAIN_WINDOW_DRAG_DROP_FORWARD_EVENT: &str = "main-window://drag-drop";

#[derive(Clone, Serialize)]
struct ForwardedDragDropPayload {
    #[serde(rename = "type")]
    event_type: &'static str, // "enter" | "over" | "drop"
    position: ForwardedDragDropPosition,
    paths: Option<Vec<String>>,
}
```

Frontend service:

```typescript
export type DragDropPayload = {
  type: "enter" | "over" | "leave" | "drop";
  position: { x: number; y: number };
  paths?: string[];
};

export function subscribeWindowDragDrop(
  onEvent: (event: { payload: DragDropPayload }) => void,
  options?: { onError?: (error: unknown) => void },
): () => void;
```

Composer consumer:

```typescript
type UsePasteAndDropOptions = {
  editableRef: React.RefObject<HTMLDivElement | null>;
  dropZoneRef?: React.RefObject<HTMLElement | null>;
  pathMappingRef: React.MutableRefObject<Map<string, string>>;
};
```

### 3. Contracts

- `src/services/dragDrop.ts` MUST subscribe to both:
  - `getCurrentWindow().onDragDropEvent(...)` for events received by the main WebView.
  - `main-window://drag-drop` for events forwarded from child WebViews.
- Rust MUST register a global `Builder::on_webview_event(...)` bridge for `WebviewEvent::DragDrop` when child WebViews can exist above the main app surface.
- The bridge MUST forward child WebView events only. It MUST NOT forward `webview.label() == "main"` because the main WebView already emits `getCurrentWindow().onDragDropEvent(...)` to the frontend.
- Forwarded `position` MUST be converted to main-window viewport coordinates before frontend target hit-testing. For child WebViews, add the child WebView physical position offset to the event-local physical position.
- Forwarded `paths` MUST be absolute path strings derived from `PathBuf::to_string_lossy()`.
- `drop` events with paths MUST flow through the existing Composer path pipeline:
  - `subscribeWindowDragDrop`
  - `usePasteAndDrop`
  - `dedupeAndValidateFilePaths`
  - `insertFilePathReferences`
- Browser Agent / child WebView code MUST NOT solve this by disabling Browser Dock, removing transparency controls, or directly mutating Composer state.
- Window transparency / opacity MUST stay decoupled from WebView drag-drop handling. Runtime native opacity commands may adjust native window alpha; WebView builder transparency must not be used as a shortcut if it changes drop behavior.

### 4. Validation & Error Matrix

| 场景 | 必须行为 | 禁止行为 |
|---|---|---|
| main WebView receives OS drop | frontend consumes native `onDragDropEvent` | require forwarded event only |
| child WebView receives OS drop | Rust forwards payload to main event bridge | silently keep event on child label |
| forwarded child position | position is main-window viewport compatible | use child-local position for Composer hit-test |
| Browser Dock active | external drop into Composer still inserts path | Browser Dock steals global drag/drop permanently |
| macOS Finder folder | inserts absolute folder reference | require folder expansion or workspace membership |
| Windows Explorer path | preserves drive-letter path and dedupes case-insensitively | compare raw drive-letter variants as distinct paths |
| Linux file manager | consumes WebKitGTK drag paths when available | assume Linux opacity support is required |
| listener teardown | all native and forwarded listeners unlisten together | leak one listener after last subscriber unsubscribes |

### 5. Good / Base / Bad Cases

- Good：main WebView receives the event directly; `dragDrop.ts` dispatches it once to subscribers.
- Good：Browser Agent child WebView receives the event; Rust forwards `main-window://drag-drop`; `dragDrop.ts` dispatches it to the same subscribers.
- Base：no child WebViews are mounted; forwarded listener remains idle and harmless.
- Bad：Browser Agent child WebView handles `DragDropEvent::Drop` only inside the browser module and the main Composer never receives `paths`.
- Bad：frontend reads `DataTransfer.files[].path` as the primary source of truth; this is unreliable for directories and modern WebViews.

### 6. Tests Required

- Frontend unit test for `src/services/dragDrop.ts`:
  - native `onDragDropEvent` dispatches to all subscribers.
  - forwarded `main-window://drag-drop` dispatches to all subscribers.
  - cleanup calls both unlisten handlers after the last subscriber unsubscribes.
- Composer hook/component test:
  - forwarded `drop` payload with file path inserts `@absolutePath`.
  - forwarded `drop` payload with folder path inserts one folder reference and does not expand children.
  - drop outside Composer target does not insert.
- Rust focused test or contract check where practical:
  - forwarded payload derives `event_type`, `paths`, and child-position offset.
  - payload derives `Clone + Serialize` because `Emitter::emit` requires both.
- Manual platform matrix:
  - macOS Finder file and folder into Composer.
  - Windows Explorer file and folder into Composer, including drive-letter path.
  - Linux file manager file and folder into Composer under the supported WebKitGTK runtime.

### 7. Wrong vs Correct

#### Wrong

```typescript
// Only listens to main WebView. Child WebView drops are invisible to Composer.
getCurrentWindow().onDragDropEvent((event) => {
  handleComposerDrop(event.payload.paths ?? []);
});
```

#### Correct

```typescript
const nativeUnlisten = await getCurrentWindow().onDragDropEvent(dispatch);
const forwardedUnlisten = await listen("main-window://drag-drop", (event) => {
  dispatch({ payload: event.payload });
});
```

#### Wrong

```rust
// Leaves the drop event scoped to browser-agent-webview-*.
tauri::Builder::default().setup(|app| {
    create_browser_child_webview(app)?;
    Ok(())
});
```

#### Correct

```rust
tauri::Builder::default()
    .on_webview_event(forward_webview_drag_drop_to_main)
    .setup(|app| {
        create_browser_child_webview(app)?;
        Ok(())
    });
```

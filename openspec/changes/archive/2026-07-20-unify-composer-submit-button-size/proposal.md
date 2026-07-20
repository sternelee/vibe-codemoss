## Why

Home Composer 曾通过 scoped responsive CSS 将发送按钮放大到 `36px`，而 Conversation Composer 保持 `30px`，导致同一 `ButtonArea` 在两个位置出现不一致的视觉尺寸。两处统一后，产品确认还需要将 primary action 整体缩小一圈；此次修复只收敛 UI geometry，保持发送行为、状态和颜色不变。

## 目标与边界

- Home 与 Conversation 的 send/stop action 统一为更紧凑的 `26px × 26px` rounded square。
- 同步将 ArrowUp icon 缩至 `14px`、stop icon 缩至 `10px`、圆角缩至 `8px`。
- 覆盖 default、disabled、enabled、stop 以及窄窗口 responsive surface。
- 仅调整 Composer 按钮外观及其 focused contract test。

## 非目标

- 不修改 submit/stop handler、readiness、keyboard shortcut 或 streaming state。
- 不调整按钮颜色、shadow、toolbar spacing 或其他 Composer controls。
- 不引入新组件、新 dependency 或新的 design token system。

## What Changes

- 移除 Home narrow viewport 将 `.submit-button` 放大到 `36px` 的视觉分叉。
- 将 shared send/stop action 从 `30px` 缩至 `26px`，同步收敛 icon 与 radius。
- 为 Home CSS 增加 send/stop size parity regression assertion。
- 保留 shared `ButtonArea` DOM 与 existing event flow。

## 方案取舍

1. **收敛 Home scoped override并缩小 shared geometry（采用）**：Home 不再拥有独立尺寸，shared contract 统一为 `26px`；改动最小，不影响组件行为。
2. **新增尺寸 prop / variant（不采用）**：会把纯 CSS drift 扩散到 component API，增加无必要的长期维护面。

## 验收标准

- Home 与 Conversation send/stop action 的 rendered geometry 均为 `26px × 26px`。
- ArrowUp icon 为 `14px`、stop icon 为 `10px`、圆角为 `8px`。
- `max-width: 640px` 下 Home 按钮不再放大到 `36px`。
- enabled / disabled / stop 状态行为与颜色保持现状。
- focused style test、TypeScript typecheck 与 OpenSpec strict validation 通过。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `composer-control-surface`: 明确 Home 与 Conversation primary send/stop action 必须共享 compact `26px` geometry，responsive style 不得放大。

## Impact

- CSS: `src/styles/home-chat.css`、`src/features/composer/components/ChatInputBox/styles/buttons.css`
- Test: `src/features/home/components/HomeChat.styles.test.ts`、`src/features/composer/components/ChatInputBox/styles/buttons.test.ts`
- Behavior/API/dependencies: 无变更

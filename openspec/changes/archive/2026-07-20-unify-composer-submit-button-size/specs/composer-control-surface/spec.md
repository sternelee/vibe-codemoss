## ADDED Requirements

### Requirement: Composer Primary Action Geometry MUST Stay Consistent Across Surfaces

Home Composer 与 Conversation Composer 的 primary send/stop action MUST 使用统一的 compact geometry，responsive styling MUST NOT 放大其中一个 surface。

#### Scenario: Home and conversation render the same compact action

- **WHEN** Home Composer 或 Conversation Composer 渲染 enabled、disabled 或 stop action
- **THEN** action MUST render as a `26px × 26px` rounded square with `8px` radius
- **AND** ArrowUp icon MUST render at `14px` while stop icon MUST render at `10px`
- **AND** state-specific color、icon 与 interaction behavior MUST remain unchanged

#### Scenario: Narrow home viewport preserves compact action

- **WHEN** Home Composer 在 `max-width: 640px` 的 responsive layout 中渲染
- **THEN** send/stop action MUST remain `26px × 26px`
- **AND** responsive styling MUST NOT enlarge it to `36px`

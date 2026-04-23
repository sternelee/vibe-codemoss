# Computer Use Bridge Frontend Contract

## Scope / Trigger

- 适用文件：
  - `src/services/tauri/computerUse.ts`
  - `src/services/tauri.ts`
  - `src/features/computer-use/constants.ts`
  - `src/features/computer-use/hooks/useComputerUseBridgeStatus.ts`
  - `src/features/computer-use/components/ComputerUseStatusCard.tsx`
  - `src/features/settings/components/settings-view/sections/CodexSection.tsx`
  - `src/types.ts`
  - `src/i18n/locales/en.part1.ts`
  - `src/i18n/locales/zh.part1.ts`
- 触发条件：
  - 修改 Computer Use status surface
  - 修改 frontend bridge type / hook / i18n keys
  - 修改 settings 中的挂载位置

## Signatures

### Service bridge

```ts
export async function getComputerUseBridgeStatus(): Promise<ComputerUseBridgeStatus>
```

### Shared type

```ts
export type ComputerUseBridgeStatus = {
  featureEnabled: boolean;
  activationEnabled: boolean;
  status: "ready" | "blocked" | "unavailable" | "unsupported";
  platform: string;
  codexAppDetected: boolean;
  pluginDetected: boolean;
  pluginEnabled: boolean;
  blockedReasons: ComputerUseBlockedReason[];
  guidanceCodes: ComputerUseGuidanceCode[];
  codexConfigPath: string | null;
  pluginManifestPath: string | null;
  helperPath: string | null;
  helperDescriptorPath: string | null;
  marketplacePath: string | null;
  diagnosticMessage: string | null;
};

export type ComputerUseActivationResult = {
  outcome: "verified" | "blocked" | "failed";
  failureKind:
    | "activation_disabled"
    | "unsupported_platform"
    | "ineligible_host"
    | "host_incompatible"
    | "already_running"
    | "remaining_blockers"
    | "timeout"
    | "launch_failed"
    | "non_zero_exit"
    | "unknown"
    | null;
  bridgeStatus: ComputerUseBridgeStatus;
  durationMs: number;
  diagnosticMessage: string | null;
  stderrSnippet: string | null;
  exitCode: number | null;
};
```

## Contracts

### Boundary rules

- feature / hook / component MUST 通过 `src/services/tauri.ts` 使用 bridge，不得在 UI 内直接 `invoke()`
- user-visible copy MUST 走 i18n，不得硬编码
- `ENABLE_COMPUTER_USE_BRIDGE` 关闭时：
  - hook 不应触发读取
  - card 不应渲染
- activation lane MUST 额外同时受 `ENABLE_COMPUTER_USE_BRIDGE_ACTIVATION` 与 backend `status.activationEnabled` 控制。
- `useComputerUseActivation` MUST 防止同一 render tick 内重复调用 service；不能只依赖 React state 更新后的 disabled button。
- status / activation hooks MUST 使用 request id、mounted guard 或等价机制忽略 stale async response。
- 手动刷新 status 前 MUST 清除旧 activation result，避免 stale probe result 覆盖刷新后的真实 status。

### UI behavior

- surface MUST 明确展示：
  - status
  - platform
  - `Codex App` detected
  - plugin detected/enabled
  - blocked reasons
  - guidance
  - path diagnostics
- activation affordance 只允许在以下条件全部满足时显示：
  - feature flag 开启
  - `activationEnabled = true`
  - `platform = "macos"`
  - `status = "blocked"`
  - app/plugin/helper 前置条件齐全
  - `blockedReasons` 包含 `helper_bridge_unverified`
- Phase 1 文案 MUST 明确说明：
  - 这是 `status-only`
  - 不调用官方 helper

### Windows contract

- `unsupported` 状态 MUST 渲染成明确不支持，而不是“去安装 / 去启用”的假动作
- `blockedReasons = ["platform_unsupported"]`
- `guidanceCodes = ["unsupported_platform"]`

## Validation & Error Matrix

| Input status | Expected UI |
|---|---|
| `blocked` + reasons/guidance | 渲染阻塞原因列表与建议列表 |
| `unsupported` on Windows | 渲染 unsupported 状态、platform_unsupported reason、unsupported_platform guidance |
| hook error | 渲染 load failed error surface |
| feature flag off | 不渲染 card |
| `activationEnabled=false` | 不渲染 activation CTA，显示 Phase 1 notice |
| activation result present then user refreshes | 先 reset activation result，再刷新 status |
| repeated activation calls before re-render | service 只被调用一次 |
| out-of-order status refresh responses | 只保留最新 refresh 结果 |

## Good / Base / Bad Cases

### Good

- 在设置页显式入口渲染状态卡片
- `Windows` 上显示 unsupported，而不是误导用户“安装后可用”

### Base

- 刷新状态只重新拉取 bridge 结果，不改设置

### Bad

- 在组件内部直接 `invoke("get_computer_use_bridge_status")`
- 把 `blocked` 渲染成“ready but needs setup”
- 缺少 path diagnostics，导致用户无法自查 bundle/cache/descriptor 路径

## Tests Required

- `npx vitest run src/features/computer-use/components/ComputerUseStatusCard.test.tsx`
- `npx vitest run src/features/computer-use/hooks/useComputerUseActivation.test.tsx`
- `npx vitest run src/features/computer-use/hooks/useComputerUseBridgeStatus.test.tsx`
- `npx vitest run src/services/tauri.test.ts`
- 必测断言：
  - blocked reasons + guidance 渲染
  - unsupported Windows surface 渲染
  - error surface 渲染
  - `getComputerUseBridgeStatus` 调用正确 command name
  - activation CTA gating、result rendering、refresh reset
  - activation duplicate trigger guard
  - status stale response guard

## Wrong vs Correct

### Wrong

```ts
const result = await invoke("get_computer_use_bridge_status");
```

问题：绕过 `src/services/tauri.ts`，会让 type mapping 与测试入口分裂。

### Correct

```ts
import { getComputerUseBridgeStatus } from "@/services/tauri";

const { status } = useComputerUseBridgeStatus({
  enabled: ENABLE_COMPUTER_USE_BRIDGE,
});
```

统一通过 bridge service + hook 读取状态。

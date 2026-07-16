# Client Web Service Settings

## Purpose

定义 mossx 客户端内 Web 服务管理能力的行为契约，确保用户可以在设置页完成端口配置、服务启停、访问地址获取与 Token 安全访问，并与现有本地/远程后端模式保持兼容。
## Requirements
### Requirement: Settings MUST Expose Web Service Management Panel

系统 MUST 在客户端设置中提供 Web 服务管理面板，至少包含端口输入、固定访问 Token 设置、运行状态、启动/停止动作与错误提示区域。

#### Scenario: panel is visible in settings
- **WHEN** 用户打开设置页并进入 Web 服务配置区域
- **THEN** 系统 MUST 展示端口输入控件、固定访问 Token 设置控件、状态显示与启动/停止按钮

#### Scenario: invalid port is blocked before start
- **WHEN** 用户输入非法端口（非数字或不在 1024-65535）并尝试启动
- **THEN** 系统 MUST 阻止启动请求
- **AND** MUST 显示可恢复的校验提示

#### Scenario: empty fixed token means automatic generation
- **WHEN** 用户未配置固定访问 Token 或清空固定访问 Token
- **THEN** 系统 MUST 将该设置解释为自动生成模式
- **AND** 下一次启动 Web Service 时 MUST NOT 向 daemon 传入固定 Token

#### Scenario: fixed token setting is persisted for future starts
- **WHEN** 用户在 Web 服务设置中输入非空固定访问 Token 并保存
- **THEN** 系统 MUST 将修剪后的 Token 持久化到 `AppSettings`
- **AND** 后续打开设置页 MUST 恢复该固定 Token 设置

#### Scenario: fixed token can be rotated explicitly
- **WHEN** 用户触发生成或轮换固定访问 Token
- **THEN** 系统 MUST 使用安全随机来源生成一个非空 Token 并保存为固定访问 Token
- **AND** 系统 MUST NOT 使用 `Math.random()` 或其它可预测伪随机来源生成固定访问 Token
- **AND** UI MUST 明确该 Token 会在下一次启动 Web Service 时生效

#### Scenario: fixed token is redacted from diagnostics
- **WHEN** 系统生成 diagnostics bundle、settings summary、日志或错误信息
- **THEN** 系统 MUST NOT 输出 `AppSettings.webServiceToken` 原值
- **AND** 系统 MAY 仅输出 `hasWebServiceToken` 或等价布尔状态

### Requirement: Settings MUST Expose Daemon Control and Availability Signals

系统 MUST 在 Web 服务配置区域展示 daemon 可用性，并提供最小可恢复控制动作。

#### Scenario: daemon status is visible
- **WHEN** 用户进入 Web 服务设置区
- **THEN** 系统 MUST 展示 daemon running/stopped 状态
- **AND** MUST 展示 daemon RPC endpoint 信息

#### Scenario: daemon can be started or stopped from settings
- **WHEN** daemon 处于 stopped 或 running 状态
- **THEN** 用户 MUST 可执行对应 start/stop 操作
- **AND** 操作后状态 MUST 通过刷新结果收敛到服务端真值

### Requirement: Web Service Lifecycle MUST Be Deterministic and Idempotent

系统 MUST 提供可重复调用的生命周期接口（start/stop/status），并保证状态收敛可预测。

#### Scenario: start transitions to running with runtime info
- **WHEN** 用户触发启动且端口可用
- **THEN** 系统 MUST 启动 Web 服务并返回 `port`、`token`、`addresses[]`
- **AND** 状态 MUST 变为 `running`

#### Scenario: fixed token is reused during start
- **WHEN** 用户已保存固定访问 Token 并触发启动
- **THEN** 系统 MUST 将该 Token 传给 daemon 的 Web Service start command
- **AND** daemon 返回的运行期 `webAccessToken` MUST 与保存的固定访问 Token 一致

#### Scenario: rotated token applies to next start when service is stopped
- **WHEN** Web Service 当前未运行
- **AND** 用户生成或保存新的固定访问 Token
- **THEN** 随后的 Start 操作 MUST 使用新的固定访问 Token

#### Scenario: rotated token does not mutate current running auth implicitly
- **WHEN** Web Service 当前正在运行
- **AND** 用户生成、保存或清空固定访问 Token
- **THEN** 当前运行期 `webAccessToken` MUST 保持不变直到服务停止或重启
- **AND** UI MUST NOT 暗示当前运行期 Token 已被立即替换

#### Scenario: auto-generated runtime token is not silently persisted
- **WHEN** 用户处于自动生成模式并启动 Web Service
- **THEN** daemon MAY 返回本次运行期生成的 `webAccessToken`
- **AND** 系统 MUST NOT 将该运行期 Token 自动写回 `AppSettings.webServiceToken`

#### Scenario: stop is idempotent
- **WHEN** 用户在服务已停止状态重复触发停止
- **THEN** 系统 MUST 返回成功或无副作用结果
- **AND** 状态 MUST 保持 `stopped`

#### Scenario: start failure remains recoverable
- **WHEN** 端口被占用或监听参数无效导致启动失败
- **THEN** 系统 MUST 返回结构化错误信息
- **AND** MUST 保持服务状态为 `stopped`

### Requirement: Control Plane and Port Semantics MUST Be Explicit

系统 MUST 明确区分 daemon RPC 控制链路与 Web 访问链路，避免端口与职责混淆。

#### Scenario: control commands use daemon RPC path
- **WHEN** 用户在设置页点击启动/停止/刷新状态
- **THEN** 系统 MUST 通过 daemon RPC 命令执行控制动作
- **AND** Web API/WebSocket 入口 MUST NOT 作为管理命令入口

#### Scenario: rpc port and web port are independently represented
- **WHEN** 系统返回运行状态
- **THEN** 状态模型 MUST 可区分 RPC endpoint 与 `webPort`
- **AND** UI MUST 明确展示 Web 访问地址 `http://127.0.0.1:<webPort>`

### Requirement: Control Plane Retry MUST Recover from Daemon Connection Errors

系统 MUST 在远端 daemon 临时不可达时提供可恢复控制路径，而不是直接失败退出。

#### Scenario: retry after local daemon bootstrap when remote call fails
- **WHEN** Web 服务命令调用返回 remote backend connection error
- **THEN** 系统 MUST 尝试启动本地 daemon
- **AND** 在启动成功后 MUST 自动重试原命令

#### Scenario: fallback failure remains diagnosable
- **WHEN** 本地 daemon 启动失败或重试仍失败
- **THEN** 系统 MUST 返回可诊断错误信息
- **AND** MUST 保留原始连接失败语义

### Requirement: Runtime Access Metadata MUST Be Observable in UI

系统 MUST 在服务运行时提供访问元数据展示，且敏感信息展示方式必须受控。

#### Scenario: addresses are rendered for local access
- **WHEN** 服务启动成功
- **THEN** 系统 MUST 至少展示 `http://127.0.0.1:<port>` 访问地址
- **AND** 若可解析局域网地址，SHALL 同步展示 LAN 地址

#### Scenario: runtime token supports masked display and reveal
- **WHEN** 服务处于运行中
- **THEN** 系统 MUST 默认以掩码形式显示当前运行期访问 Token
- **AND** 用户显式操作后 MUST 支持明文查看与恢复掩码

#### Scenario: runtime token can be copied explicitly
- **WHEN** 用户点击复制操作
- **THEN** 系统 MUST 将当前运行期访问 Token 写入剪贴板
- **AND** MUST 给出已复制反馈

#### Scenario: fixed token setting is distinct from runtime token
- **WHEN** 用户查看 Web 服务设置面板
- **THEN** UI MUST 区分“固定访问 Token 设置”和“当前运行期 Token”
- **AND** UI MUST NOT 暗示修改固定访问 Token 会立即改变已运行服务的当前 Token

### Requirement: API and WebSocket Access MUST Enforce Token Authentication

系统 MUST 对 Web API 与 WebSocket 入口执行 `webAccessToken` 鉴权，未授权请求不可访问服务能力。

#### Scenario: unauthorized request is rejected
- **WHEN** 请求未携带 Token 或 Token 不匹配
- **THEN** 系统 MUST 返回鉴权失败（401 或等价拒绝）
- **AND** MUST NOT 返回受保护业务数据

#### Scenario: authorized request is accepted
- **WHEN** 请求携带合法 Token
- **THEN** 系统 MUST 允许访问受保护接口
- **AND** 返回结果 MUST 与桌面端同源命令契约一致

#### Scenario: query token is accepted for web access
- **WHEN** 请求通过 query 参数携带合法 `token`
- **THEN** 系统 MUST 通过鉴权
- **AND** 行为 MUST 与 Bearer token 鉴权结果一致

#### Scenario: web token remains effective when remote token is empty
- **WHEN** `remoteBackendToken` 为空但 Web 服务已运行
- **THEN** Web API/WebSocket 仍 MUST 校验 `webAccessToken`
- **AND** 系统 MUST NOT 因 RPC token 兼容模式而放宽 Web 入口权限

### Requirement: Packaged Web Service MUST Resolve Bundled Frontend Assets

Web Service runtime MUST resolve packaged frontend assets from supported desktop bundle layouts before falling back to the "frontend assets not found" page.

#### Scenario: explicit asset directory remains highest-priority override
- **WHEN** `MOSSX_WEB_ASSETS_DIR` is set to a directory containing a valid frontend `index.html`
- **THEN** Web Service MUST serve that directory as the frontend asset root
- **AND** it MAY also accept the same env value when the real asset root is its `dist` child

#### Scenario: invalid empty shell index is skipped
- **WHEN** a candidate asset directory contains an `index.html` without the app mount root or module/asset entry
- **THEN** Web Service MUST treat that candidate as invalid
- **AND** it MUST continue probing later asset candidates before serving `/app`

#### Scenario: local development layout remains supported
- **WHEN** Web Service starts from a development checkout whose `cwd` or daemon executable ancestors expose a valid `dist/index.html`
- **THEN** Web Service MUST resolve that `dist` directory without requiring `MOSSX_WEB_ASSETS_DIR`
- **AND** existing `resources/dist` and `Resources/dist` candidates MUST remain supported for Windows and macOS bundle compatibility

#### Scenario: Linux AppImage layout is resolved from APPDIR
- **WHEN** Web Service runs inside a Linux AppImage where `APPDIR` points at the mounted bundle root
- **THEN** Web Service MUST probe `$APPDIR/usr/lib/ccgui/dist/index.html`
- **AND** it MUST serve that directory when present and valid

#### Scenario: Linux AppImage layout is resolved from daemon executable ancestry
- **WHEN** Web Service runs inside a Linux AppImage with daemon executable path like `$APPDIR/usr/bin/cc_gui_daemon`
- **THEN** Web Service MUST derive the bundle root from executable ancestors and probe `$APPDIR/usr/lib/ccgui/dist/index.html`
- **AND** this fallback MUST NOT change token authentication, RPC routing, port validation, or static asset response semantics

### Requirement: Existing Backend Mode Contract MUST Remain Backward Compatible

系统 MUST 保持现有 `backendMode`、`remoteBackendHost`、`remoteBackendToken` 语义稳定，不得因引入 Web 服务管理而破坏既有流程。

#### Scenario: existing remote configuration remains valid
- **WHEN** 用户已有远程后端配置且升级到新版本
- **THEN** 系统 MUST 保留原有配置值
- **AND** 远程连接流程 MUST 继续可用

#### Scenario: web service operation does not force implicit mode switch
- **WHEN** 用户仅执行 Web 服务启停或查看状态
- **THEN** 系统 MUST NOT 隐式改写 `backendMode` 为其他值
- **AND** 模式切换 MUST 仅由用户显式配置动作触发

### Requirement: Implementation MUST Be Compatible with Windows and macOS

系统 MUST 在 Windows 与 macOS 上保持一致可用的 Web 服务管理行为。

#### Scenario: lifecycle works on both target platforms
- **WHEN** 在 Windows 或 macOS 上执行 start/stop/status 流程
- **THEN** 系统 MUST 成功完成生命周期操作
- **AND** 返回状态字段与错误语义 MUST 保持一致

#### Scenario: auth behavior remains consistent cross-platform
- **WHEN** 在 Windows 或 macOS 上发起未授权与已授权访问
- **THEN** 系统 MUST 对未授权请求执行拒绝
- **AND** 对授权请求返回等价成功结果

### Requirement: New Capability MUST Use Additive Integration with Minimal Legacy Impact

系统 MUST 以新增模块承载新功能，并将老代码改动控制在必要接线范围内。

#### Scenario: feature integration uses new modules first
- **WHEN** 实现 Web 服务 runtime 与鉴权链路
- **THEN** 系统 MUST 优先通过新增文件/模块落地核心逻辑
- **AND** 对既有稳定模块仅做命令注册、UI 挂载、文案补充等必要改动

#### Scenario: legacy behavior remains unchanged after integration
- **WHEN** 新功能接入完成并执行回归
- **THEN** 系统 MUST 保持既有 remote/local 主流程行为不变
- **AND** 未涉及场景的老代码语义 MUST NOT 被重写或隐式改变

### Requirement: Web Service Runtime Control MUST Stay Compatible During Bridge Extraction
第一阶段 bridge 抽取 MUST 保持 web-service control plane、daemon fallback 与 runtime mode split 语义兼容。

#### Scenario: bridge extraction preserves control-plane command routing
- **WHEN** Web service settings、daemon control 或 runtime bridge 被抽取为 facade 与领域模块
- **THEN** start/stop/status 等 control-plane 行为 MUST 继续走既有 daemon RPC 语义
- **AND** 抽取 MUST NOT 把 Web API / WebSocket 入口误用为管理命令通道

#### Scenario: bridge extraction preserves web-service fallback semantics
- **WHEN** desktop Tauri runtime 与 web-service runtime 共用的 bridge surface 被收敛
- **THEN** remote connection error、local daemon bootstrap retry 与 fallback 结果 MUST 保持兼容
- **AND** 抽取 MUST NOT 只验证 desktop path 而破坏 web-service path

### Requirement: Web Service Settings MUST Manage Downloadable Frontend Assets

系统 MUST 在 Web Service 设置区域检测当前 App version 对应的 managed Web assets，并提供显式的下载安装与重新检测动作。

#### Scenario: Missing assets expose an install action
- **WHEN** 用户打开 Web Service 设置且 `<app-data>/web-assets/current` 不包含当前版本的有效 Web assets
- **THEN** UI MUST 显示未安装状态与“下载安装”动作
- **AND** 本地 Web Service 启动动作 MUST 保持 disabled

#### Scenario: Remote and development runtimes are not locally gated
- **WHEN** Web Service 指向非 loopback remote daemon 或 desktop client 运行于 development build
- **THEN** desktop-local managed assets missing 状态 MUST NOT 阻止既有 Web Service start command
- **AND** development checkout asset discovery MUST 保持可用

#### Scenario: Ready assets expose their installed version
- **WHEN** managed Web assets 通过版本、manifest、entrypoint 与目录完整性检测
- **THEN** UI MUST 显示已安装状态与 installed version
- **AND** 本地 Web Service 启动动作 MUST 可按既有端口与 daemon 条件执行

#### Scenario: Install action is single-flight and re-checkable
- **WHEN** 用户触发下载安装
- **THEN** UI MUST 在 command 完成前显示 installing 状态并阻止重复安装动作
- **AND** command 完成后 MUST 使用返回状态刷新 UI
- **AND** 失败状态 MUST 保留重新安装或重新检测入口

#### Scenario: Ready assets remain repairable and async actions expose progress
- **WHEN** 当前版本 Web assets 已安装
- **THEN** UI MUST 保留“重新下载安装”动作以支持同版本覆盖修复
- **AND** 下载安装、本地安装或重新检测执行期间，触发按钮 MUST 显示 loading indicator 与对应忙碌文案
- **AND** 所有 Web assets 操作 MUST 在当前动作完成前保持 disabled
- **AND** 用户主动操作 MUST 在资源状态行下方显示开始、成功或 backend error 的可访问 operation log

#### Scenario: Local release-format package can be selected explicitly
- **WHEN** 用户选择本地 `ccgui-web-assets_<version>.zip`
- **THEN** desktop backend MUST 读取相邻的 `<archive>.sha256`
- **AND** MUST 复用 download installation 的 checksum、ZIP safety、manifest、version、entrypoint 与 staging activation 校验
- **AND** 文件选择取消 MUST 保持当前安装状态不变

#### Scenario: Invalid local package keeps the previous installation
- **WHEN** 本地 ZIP、相邻 checksum、manifest 或 assets version 无效
- **THEN** backend MUST 返回可定位的 failed status
- **AND** MUST NOT 删除或替换先前可用的 `current` directory

### Requirement: Downloadable Web Assets Installation MUST Be Transactional and Validated

Desktop backend MUST 从当前 App version 对应的 Release 下载唯一的跨平台 ZIP，并在激活前完成 HTTP、SHA-256、ZIP path、manifest、version 与 entrypoint 校验。

#### Scenario: Valid archive is installed atomically
- **WHEN** checksum 与 ZIP 下载成功且 archive 内容满足当前 schema/version/entrypoint contract
- **THEN** backend MUST 先解压到 managed staging directory
- **AND** MUST 原子替换 `<app-data>/web-assets/current`
- **AND** MUST 返回 `state=ready` 与匹配的 installed version

#### Scenario: Corrupt or unsafe archive is rejected
- **WHEN** checksum 不匹配、ZIP entry 存在 path traversal/symlink、manifest 无效、version 不匹配或 `index.html` 缺失
- **THEN** backend MUST 返回可定位的失败信息
- **AND** MUST NOT 激活 staging directory
- **AND** MUST NOT 破坏先前可用的 `current` directory

#### Scenario: Release download fails
- **WHEN** checksum 或 ZIP 请求超时、网络失败或返回非成功 HTTP status
- **THEN** backend MUST 返回 `state=failed` 和可重试错误
- **AND** MUST 清理本次 staging/download 临时文件

### Requirement: Local Daemon MUST Resolve Managed Web Assets Without Restart Coupling

本地 daemon Web Service runtime MUST 将 daemon `data_dir` 下的 managed `web-assets/current` 作为标准 asset candidate，并保留显式环境变量与 development/bundle candidates 的既有兼容性。

#### Scenario: Already-running daemon sees newly installed assets
- **WHEN** 本地 daemon 已运行且用户随后成功安装 managed Web assets
- **THEN** 下一次启动 Web Service 时 daemon MUST 从 `<data-dir>/web-assets/current` 解析 frontend root
- **AND** 用户 MUST NOT 被要求重启 desktop client 或 daemon

#### Scenario: Explicit override remains highest priority
- **WHEN** `MOSSX_WEB_ASSETS_DIR` 指向有效 frontend root
- **THEN** daemon MUST 优先使用该目录
- **AND** managed data directory candidate MUST 仅作为后续 fallback

#### Scenario: Development checkout fallback remains available
- **WHEN** managed assets 不存在但 daemon 运行于包含有效 `dist` 的 development checkout
- **THEN** daemon MUST 继续通过既有 candidate discovery 使用 checkout assets
- **AND** 本次变更 MUST NOT 改变 Web authentication、RPC routing 或 static response semantics

### Requirement: Release MUST Publish One Cross-Platform Web Assets Archive

Release pipeline MUST 每个 App version 构建并发布一次 platform-neutral Web assets ZIP 与对应 SHA-256 文件，且三个 desktop 平台 MUST 共用该产物。

#### Scenario: Release contains the installable assets contract
- **WHEN** Release workflow 为某个 App version 成功完成
- **THEN** Release MUST 包含 `ccgui-web-assets_<version>.zip` 与 `ccgui-web-assets_<version>.zip.sha256`
- **AND** ZIP root MUST 包含 `manifest.json`、`index.html` 与 Vite assets tree

#### Scenario: Web assets build failure blocks release publication
- **WHEN** frontend build、manifest creation、archive creation 或 checksum creation 失败
- **THEN** final Release job MUST NOT publish an incomplete Release
- **AND** pipeline MUST NOT silently omit Web assets artifacts


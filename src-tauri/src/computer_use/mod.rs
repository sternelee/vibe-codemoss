use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::{Duration, Instant};

use tauri::State;

use crate::codex::{config as codex_config, home as codex_home};

mod platform;

const COMPUTER_USE_BRIDGE_ENABLED: bool = true;
const COMPUTER_USE_ACTIVATION_ENABLED: bool = true;
const COMPUTER_USE_ACTIVATION_DISABLED_ENV: &str = "MOSSX_DISABLE_COMPUTER_USE_ACTIVATION";
const COMPUTER_USE_PLUGIN_ID: &str = "computer-use@openai-bundled";
const COMPUTER_USE_PLUGIN_NAME: &str = "computer-use";
const COMPUTER_USE_MCP_SERVER_NAME: &str = "computer-use";
const COMPUTER_USE_ACTIVATION_TIMEOUT_MS: u64 = 5_000;
const COMPUTER_USE_ACTIVATION_HELP_ARG: &str = "--help";
const COMPUTER_USE_ACTIVATION_SNIPPET_LIMIT: usize = 240;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) enum ComputerUseAvailabilityStatus {
    Ready,
    Blocked,
    Unavailable,
    Unsupported,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub(crate) enum ComputerUseBlockedReason {
    PlatformUnsupported,
    CodexAppMissing,
    PluginMissing,
    PluginDisabled,
    HelperMissing,
    HelperBridgeUnverified,
    PermissionRequired,
    ApprovalRequired,
    UnknownPrerequisite,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub(crate) enum ComputerUseGuidanceCode {
    UnsupportedPlatform,
    InstallCodexApp,
    InstallOfficialPlugin,
    EnableOfficialPlugin,
    VerifyHelperInstallation,
    VerifyHelperBridge,
    GrantSystemPermissions,
    ReviewAllowedApps,
    InspectOfficialCodexSetup,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ComputerUseBridgeStatus {
    pub(crate) feature_enabled: bool,
    pub(crate) activation_enabled: bool,
    pub(crate) status: ComputerUseAvailabilityStatus,
    pub(crate) platform: String,
    pub(crate) codex_app_detected: bool,
    pub(crate) plugin_detected: bool,
    pub(crate) plugin_enabled: bool,
    pub(crate) blocked_reasons: Vec<ComputerUseBlockedReason>,
    pub(crate) guidance_codes: Vec<ComputerUseGuidanceCode>,
    pub(crate) codex_config_path: Option<String>,
    pub(crate) plugin_manifest_path: Option<String>,
    pub(crate) helper_path: Option<String>,
    pub(crate) helper_descriptor_path: Option<String>,
    pub(crate) marketplace_path: Option<String>,
    pub(crate) diagnostic_message: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub(crate) enum ComputerUseActivationOutcome {
    Verified,
    Blocked,
    Failed,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub(crate) enum ComputerUseActivationFailureKind {
    ActivationDisabled,
    UnsupportedPlatform,
    IneligibleHost,
    HostIncompatible,
    AlreadyRunning,
    RemainingBlockers,
    Timeout,
    LaunchFailed,
    NonZeroExit,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ComputerUseActivationResult {
    pub(crate) outcome: ComputerUseActivationOutcome,
    pub(crate) failure_kind: Option<ComputerUseActivationFailureKind>,
    pub(crate) bridge_status: ComputerUseBridgeStatus,
    pub(crate) duration_ms: u64,
    pub(crate) diagnostic_message: Option<String>,
    pub(crate) stderr_snippet: Option<String>,
    pub(crate) exit_code: Option<i32>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct ComputerUseActivationVerification {
    helper_identity: ComputerUseActivationIdentity,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct ComputerUseActivationIdentity {
    helper_path: String,
    helper_descriptor_path: Option<String>,
    plugin_manifest_path: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
struct ComputerUseDetectionSnapshot {
    codex_app_detected: bool,
    plugin_detected: bool,
    plugin_enabled: bool,
    helper_present: bool,
    helper_bridge_verified: bool,
    permission_verified: bool,
    approval_verified: bool,
    codex_config_path: Option<String>,
    plugin_manifest_path: Option<String>,
    helper_path: Option<String>,
    helper_descriptor_path: Option<String>,
    marketplace_path: Option<String>,
    diagnostic_message: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum PlatformAvailability {
    Supported,
    Unsupported,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct PlatformAdapterResult {
    platform: &'static str,
    availability: PlatformAvailability,
    snapshot: ComputerUseDetectionSnapshot,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct ComputerUseActivationContext {
    adapter_result: PlatformAdapterResult,
    bridge_status: ComputerUseBridgeStatus,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct ComputerUseHelperProbeExecution {
    succeeded: bool,
    failure_kind: Option<ComputerUseActivationFailureKind>,
    diagnostic_message: String,
    stderr_snippet: Option<String>,
    exit_code: Option<i32>,
    duration_ms: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct ComputerUseHelperLaunchSpec {
    command_path: PathBuf,
    args: Vec<String>,
    current_dir: PathBuf,
}

#[tauri::command]
pub(crate) async fn get_computer_use_bridge_status(
    state: State<'_, crate::state::AppState>,
) -> Result<ComputerUseBridgeStatus, String> {
    let activation_verification = state
        .computer_use_activation_verification
        .lock()
        .await
        .clone();
    tokio::task::spawn_blocking(move || {
        resolve_computer_use_bridge_status(activation_verification.as_ref())
    })
    .await
    .map_err(|error| format!("failed to join computer use bridge status task: {error}"))
}

#[tauri::command]
pub(crate) async fn run_computer_use_activation_probe(
    state: State<'_, crate::state::AppState>,
) -> Result<ComputerUseActivationResult, String> {
    let activation_verification = state
        .computer_use_activation_verification
        .lock()
        .await
        .clone();
    let context = tokio::task::spawn_blocking(move || {
        resolve_activation_context(activation_verification.as_ref())
    })
    .await
    .map_err(|error| format!("failed to join computer use activation preflight task: {error}"))?;

    if !computer_use_activation_enabled() {
        return Ok(build_activation_result(
            ComputerUseActivationOutcome::Failed,
            Some(ComputerUseActivationFailureKind::ActivationDisabled),
            context.bridge_status,
            0,
            Some("Computer Use activation lane is disabled by host flag.".to_string()),
            None,
            None,
        ));
    }

    let _probe_guard = match state.computer_use_activation_lock.try_lock() {
        Ok(guard) => guard,
        Err(_) => {
            return Ok(build_activation_result(
                ComputerUseActivationOutcome::Failed,
                Some(ComputerUseActivationFailureKind::AlreadyRunning),
                context.bridge_status,
                0,
                Some("A Computer Use activation probe is already running.".to_string()),
                None,
                None,
            ));
        }
    };

    if !is_activation_probe_eligible(&context.bridge_status) {
        return Ok(build_non_executable_activation_result(
            context.bridge_status,
        ));
    }

    let Some(verification) =
        ComputerUseActivationVerification::from_snapshot(&context.adapter_result.snapshot)
    else {
        return Ok(build_activation_result(
            ComputerUseActivationOutcome::Failed,
            Some(ComputerUseActivationFailureKind::IneligibleHost),
            context.bridge_status,
            0,
            Some(
                "Computer Use helper path is missing, so the activation probe cannot start."
                    .to_string(),
            ),
            None,
            None,
        ));
    };

    let probe_execution = run_helper_bridge_probe(
        &verification.helper_identity.helper_path,
        context
            .adapter_result
            .snapshot
            .helper_descriptor_path
            .as_deref(),
    )
    .await;

    if !probe_execution.succeeded {
        return Ok(build_activation_result(
            ComputerUseActivationOutcome::Failed,
            probe_execution.failure_kind,
            context.bridge_status,
            probe_execution.duration_ms,
            Some(probe_execution.diagnostic_message),
            probe_execution.stderr_snippet,
            probe_execution.exit_code,
        ));
    }

    {
        let mut stored = state.computer_use_activation_verification.lock().await;
        *stored = Some(verification.clone());
    }

    let refreshed_context =
        tokio::task::spawn_blocking(move || resolve_activation_context(Some(&verification)))
            .await
            .map_err(|error| {
                format!("failed to join computer use activation refresh task: {error}")
            })?;

    let (outcome, failure_kind, diagnostic_message) = match refreshed_context.bridge_status.status {
        ComputerUseAvailabilityStatus::Ready => (
            ComputerUseActivationOutcome::Verified,
            None,
            Some("Computer Use helper bridge verified with a bounded '--help' probe.".to_string()),
        ),
        ComputerUseAvailabilityStatus::Blocked => (
            ComputerUseActivationOutcome::Blocked,
            Some(ComputerUseActivationFailureKind::RemainingBlockers),
            Some(
                "Computer Use helper bridge verified, but remaining permissions or approvals still require manual confirmation."
                    .to_string(),
            ),
        ),
        _ => (
            ComputerUseActivationOutcome::Failed,
            Some(ComputerUseActivationFailureKind::Unknown),
            Some(
                "Computer Use probe completed, but the bridge status did not converge to a usable state."
                    .to_string(),
            ),
        ),
    };

    Ok(build_activation_result(
        outcome,
        failure_kind,
        refreshed_context.bridge_status,
        probe_execution.duration_ms,
        diagnostic_message,
        probe_execution.stderr_snippet,
        probe_execution.exit_code,
    ))
}

fn resolve_computer_use_bridge_status(
    activation_verification: Option<&ComputerUseActivationVerification>,
) -> ComputerUseBridgeStatus {
    if !COMPUTER_USE_BRIDGE_ENABLED {
        return ComputerUseBridgeStatus {
            feature_enabled: false,
            activation_enabled: false,
            status: ComputerUseAvailabilityStatus::Unavailable,
            platform: platform::platform_name().to_string(),
            codex_app_detected: false,
            plugin_detected: false,
            plugin_enabled: false,
            blocked_reasons: Vec::new(),
            guidance_codes: Vec::new(),
            codex_config_path: codex_config::config_toml_path().and_then(path_to_string),
            plugin_manifest_path: None,
            helper_path: None,
            helper_descriptor_path: None,
            marketplace_path: None,
            diagnostic_message: Some("computer use bridge is disabled by host flag".to_string()),
        };
    }

    resolve_activation_context(activation_verification).bridge_status
}

fn resolve_activation_context(
    activation_verification: Option<&ComputerUseActivationVerification>,
) -> ComputerUseActivationContext {
    let mut adapter_result = platform::detect_platform_state(detect_computer_use_snapshot());
    apply_activation_verification(&mut adapter_result.snapshot, activation_verification);
    let bridge_status = build_bridge_status(adapter_result.clone());

    ComputerUseActivationContext {
        adapter_result,
        bridge_status,
    }
}

fn detect_computer_use_snapshot() -> ComputerUseDetectionSnapshot {
    let mut snapshot = ComputerUseDetectionSnapshot {
        codex_config_path: codex_config::config_toml_path().and_then(path_to_string),
        ..ComputerUseDetectionSnapshot::default()
    };

    let config_path = snapshot
        .codex_config_path
        .as_ref()
        .map(PathBuf::from)
        .or_else(codex_config::config_toml_path);

    if let Some(path) = config_path.as_ref() {
        match read_plugin_enabled_from_config(path) {
            Ok(Some(enabled)) => {
                snapshot.plugin_detected = true;
                snapshot.plugin_enabled = enabled;
            }
            Ok(None) => {}
            Err(error) => {
                snapshot.diagnostic_message = Some(error);
            }
        }
    }

    let cache_root = resolve_computer_use_cache_root();
    if let Some(manifest_path) = detect_plugin_manifest_path(cache_root.as_deref()) {
        snapshot.plugin_detected = true;
        snapshot.plugin_manifest_path = path_to_string(manifest_path);
    }

    snapshot
}

fn apply_activation_verification(
    snapshot: &mut ComputerUseDetectionSnapshot,
    activation_verification: Option<&ComputerUseActivationVerification>,
) {
    if activation_verification.is_some_and(|verification| verification.applies_to(snapshot)) {
        snapshot.helper_bridge_verified = true;
    }
}

fn build_bridge_status(adapter_result: PlatformAdapterResult) -> ComputerUseBridgeStatus {
    let snapshot = adapter_result.snapshot;
    let (status, blocked_reasons, guidance_codes) =
        classify_status(adapter_result.availability, &snapshot);

    ComputerUseBridgeStatus {
        feature_enabled: COMPUTER_USE_BRIDGE_ENABLED,
        activation_enabled: computer_use_activation_enabled(),
        status,
        platform: adapter_result.platform.to_string(),
        codex_app_detected: snapshot.codex_app_detected,
        plugin_detected: snapshot.plugin_detected,
        plugin_enabled: snapshot.plugin_enabled,
        blocked_reasons,
        guidance_codes,
        codex_config_path: snapshot.codex_config_path,
        plugin_manifest_path: snapshot.plugin_manifest_path,
        helper_path: snapshot.helper_path,
        helper_descriptor_path: snapshot.helper_descriptor_path,
        marketplace_path: snapshot.marketplace_path,
        diagnostic_message: snapshot.diagnostic_message,
    }
}

fn classify_status(
    availability: PlatformAvailability,
    snapshot: &ComputerUseDetectionSnapshot,
) -> (
    ComputerUseAvailabilityStatus,
    Vec<ComputerUseBlockedReason>,
    Vec<ComputerUseGuidanceCode>,
) {
    if availability == PlatformAvailability::Unsupported {
        return (
            ComputerUseAvailabilityStatus::Unsupported,
            vec![ComputerUseBlockedReason::PlatformUnsupported],
            vec![ComputerUseGuidanceCode::UnsupportedPlatform],
        );
    }

    if !snapshot.codex_app_detected {
        return (
            ComputerUseAvailabilityStatus::Unavailable,
            vec![ComputerUseBlockedReason::CodexAppMissing],
            vec![ComputerUseGuidanceCode::InstallCodexApp],
        );
    }

    if !snapshot.plugin_detected {
        return (
            ComputerUseAvailabilityStatus::Unavailable,
            vec![ComputerUseBlockedReason::PluginMissing],
            vec![ComputerUseGuidanceCode::InstallOfficialPlugin],
        );
    }

    if !snapshot.plugin_enabled {
        return (
            ComputerUseAvailabilityStatus::Blocked,
            vec![ComputerUseBlockedReason::PluginDisabled],
            vec![ComputerUseGuidanceCode::EnableOfficialPlugin],
        );
    }

    if !snapshot.helper_present {
        return (
            ComputerUseAvailabilityStatus::Blocked,
            vec![ComputerUseBlockedReason::HelperMissing],
            vec![ComputerUseGuidanceCode::VerifyHelperInstallation],
        );
    }

    let mut blocked_reasons = Vec::new();
    let mut guidance_codes = Vec::new();

    if !snapshot.helper_bridge_verified {
        blocked_reasons.push(ComputerUseBlockedReason::HelperBridgeUnverified);
        guidance_codes.push(ComputerUseGuidanceCode::VerifyHelperBridge);
    }

    if !snapshot.permission_verified {
        blocked_reasons.push(ComputerUseBlockedReason::PermissionRequired);
        guidance_codes.push(ComputerUseGuidanceCode::GrantSystemPermissions);
    }

    if !snapshot.approval_verified {
        blocked_reasons.push(ComputerUseBlockedReason::ApprovalRequired);
        guidance_codes.push(ComputerUseGuidanceCode::ReviewAllowedApps);
    }

    if !blocked_reasons.is_empty() {
        return (
            ComputerUseAvailabilityStatus::Blocked,
            blocked_reasons,
            dedupe_guidance_codes(guidance_codes),
        );
    }

    (ComputerUseAvailabilityStatus::Ready, Vec::new(), Vec::new())
}

fn is_activation_probe_eligible(status: &ComputerUseBridgeStatus) -> bool {
    status.activation_enabled
        && status.platform == "macos"
        && status.status == ComputerUseAvailabilityStatus::Blocked
        && status.codex_app_detected
        && status.plugin_detected
        && status.plugin_enabled
        && status.helper_path.is_some()
        && status
            .blocked_reasons
            .contains(&ComputerUseBlockedReason::HelperBridgeUnverified)
}

fn computer_use_activation_enabled() -> bool {
    COMPUTER_USE_ACTIVATION_ENABLED
        && !activation_disabled_env_value(std::env::var(COMPUTER_USE_ACTIVATION_DISABLED_ENV).ok())
}

fn activation_disabled_env_value(value: Option<String>) -> bool {
    value
        .as_deref()
        .map(str::trim)
        .map(str::to_ascii_lowercase)
        .is_some_and(|value| matches!(value.as_str(), "1" | "true" | "yes" | "on"))
}

fn build_non_executable_activation_result(
    bridge_status: ComputerUseBridgeStatus,
) -> ComputerUseActivationResult {
    match bridge_status.status {
        ComputerUseAvailabilityStatus::Ready => build_activation_result(
            ComputerUseActivationOutcome::Verified,
            None,
            bridge_status,
            0,
            Some("Computer Use helper bridge is already verified in this app session.".to_string()),
            None,
            None,
        ),
        ComputerUseAvailabilityStatus::Blocked
            if !bridge_status
                .blocked_reasons
                .contains(&ComputerUseBlockedReason::HelperBridgeUnverified) =>
        {
            build_activation_result(
                ComputerUseActivationOutcome::Blocked,
                Some(ComputerUseActivationFailureKind::RemainingBlockers),
                bridge_status,
                0,
                Some(
                    "Computer Use helper bridge is already verified, but remaining blockers still need manual resolution."
                        .to_string(),
                ),
                None,
                None,
            )
        }
        ComputerUseAvailabilityStatus::Unsupported => build_activation_result(
            ComputerUseActivationOutcome::Failed,
            Some(ComputerUseActivationFailureKind::UnsupportedPlatform),
            bridge_status,
            0,
            Some("Computer Use activation probe is only available on macOS.".to_string()),
            None,
            None,
        ),
        _ => build_activation_result(
            ComputerUseActivationOutcome::Failed,
            Some(ComputerUseActivationFailureKind::IneligibleHost),
            bridge_status,
            0,
            Some(
                "Computer Use activation probe is only available after Codex App, plugin, and helper detection all succeed."
                    .to_string(),
            ),
            None,
            None,
        ),
    }
}

fn build_activation_result(
    outcome: ComputerUseActivationOutcome,
    failure_kind: Option<ComputerUseActivationFailureKind>,
    bridge_status: ComputerUseBridgeStatus,
    duration_ms: u64,
    diagnostic_message: Option<String>,
    stderr_snippet: Option<String>,
    exit_code: Option<i32>,
) -> ComputerUseActivationResult {
    ComputerUseActivationResult {
        outcome,
        failure_kind,
        bridge_status,
        duration_ms,
        diagnostic_message,
        stderr_snippet,
        exit_code,
    }
}

async fn run_helper_bridge_probe(
    helper_path: &str,
    helper_descriptor_path: Option<&str>,
) -> ComputerUseHelperProbeExecution {
    let started_at = Instant::now();
    let Some(launch_spec) = resolve_helper_probe_launch_spec(helper_descriptor_path, helper_path)
    else {
        return ComputerUseHelperProbeExecution {
            succeeded: false,
            failure_kind: Some(ComputerUseActivationFailureKind::IneligibleHost),
            diagnostic_message:
                "Computer Use helper descriptor could not be resolved into a launch contract."
                    .to_string(),
            stderr_snippet: None,
            exit_code: None,
            duration_ms: started_at.elapsed().as_millis() as u64,
        };
    };

    if should_use_diagnostics_only_probe(&launch_spec.command_path) {
        return ComputerUseHelperProbeExecution {
            succeeded: false,
            failure_kind: Some(ComputerUseActivationFailureKind::HostIncompatible),
            diagnostic_message:
                "Computer Use helper is packaged as a nested app-bundle CLI. This host now uses diagnostics-only fallback instead of direct exec because macOS can reject that launch path outside the official Codex parent contract."
                    .to_string(),
            stderr_snippet: Some(format!(
                "Skipped direct helper launch for {} {}",
                launch_spec.command_path.display(),
                launch_spec.args.join(" ")
            )),
            exit_code: None,
            duration_ms: started_at.elapsed().as_millis() as u64,
        };
    }

    let mut command = crate::utils::async_command(&launch_spec.command_path);
    command
        .args(&launch_spec.args)
        .arg(COMPUTER_USE_ACTIVATION_HELP_ARG)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .current_dir(&launch_spec.current_dir);

    let child = match command.spawn() {
        Ok(child) => child,
        Err(error) => {
            return ComputerUseHelperProbeExecution {
                succeeded: false,
                failure_kind: Some(ComputerUseActivationFailureKind::LaunchFailed),
                diagnostic_message: format!(
                    "Failed to start the official Computer Use helper probe: {error}"
                ),
                stderr_snippet: None,
                exit_code: None,
                duration_ms: started_at.elapsed().as_millis() as u64,
            };
        }
    };

    let output = match tokio::time::timeout(
        Duration::from_millis(COMPUTER_USE_ACTIVATION_TIMEOUT_MS),
        child.wait_with_output(),
    )
    .await
    {
        Ok(Ok(output)) => output,
        Ok(Err(error)) => {
            return ComputerUseHelperProbeExecution {
                succeeded: false,
                failure_kind: Some(ComputerUseActivationFailureKind::LaunchFailed),
                diagnostic_message: format!(
                    "Computer Use helper probe started but failed while waiting for output: {error}"
                ),
                stderr_snippet: None,
                exit_code: None,
                duration_ms: started_at.elapsed().as_millis() as u64,
            };
        }
        Err(_) => {
            return ComputerUseHelperProbeExecution {
                succeeded: false,
                failure_kind: Some(ComputerUseActivationFailureKind::Timeout),
                diagnostic_message: format!(
                    "Computer Use helper probe did not finish within {}ms.",
                    COMPUTER_USE_ACTIVATION_TIMEOUT_MS
                ),
                stderr_snippet: None,
                exit_code: None,
                duration_ms: started_at.elapsed().as_millis() as u64,
            };
        }
    };

    let duration_ms = started_at.elapsed().as_millis() as u64;
    let stdout_snippet = output_snippet(&String::from_utf8_lossy(&output.stdout));
    let stderr_snippet = output_snippet(&String::from_utf8_lossy(&output.stderr));

    if !output.status.success() {
        return ComputerUseHelperProbeExecution {
            succeeded: false,
            failure_kind: Some(ComputerUseActivationFailureKind::NonZeroExit),
            diagnostic_message: format!(
                "Computer Use helper probe exited with non-zero status {}.",
                output.status.code().unwrap_or(-1)
            ),
            stderr_snippet: stderr_snippet.or(stdout_snippet),
            exit_code: output.status.code(),
            duration_ms,
        };
    }

    let diagnostic_message = match stdout_snippet {
        Some(snippet) => format!(
            "Computer Use helper accepted '--help' within {}ms. Sample output: {snippet}",
            duration_ms
        ),
        None => format!(
            "Computer Use helper accepted '--help' within {}ms.",
            duration_ms
        ),
    };

    ComputerUseHelperProbeExecution {
        succeeded: true,
        failure_kind: None,
        diagnostic_message,
        stderr_snippet,
        exit_code: output.status.code(),
        duration_ms,
    }
}

fn resolve_helper_probe_launch_spec(
    helper_descriptor_path: Option<&str>,
    helper_path: &str,
) -> Option<ComputerUseHelperLaunchSpec> {
    if let Some(descriptor_path) = helper_descriptor_path.map(PathBuf::from) {
        if let Some(descriptor) = parse_helper_descriptor(&descriptor_path) {
            return Some(ComputerUseHelperLaunchSpec {
                command_path: descriptor.command_path,
                args: descriptor.args,
                current_dir: descriptor.current_dir,
            });
        }
    }

    Some(ComputerUseHelperLaunchSpec {
        command_path: PathBuf::from(helper_path),
        args: Vec::new(),
        current_dir: Path::new(helper_path).parent()?.to_path_buf(),
    })
}

fn should_use_diagnostics_only_probe(command_path: &Path) -> bool {
    cfg!(target_os = "macos")
        && path_looks_like_nested_app_binary(command_path)
        && !current_host_looks_like_official_codex()
}

fn current_host_looks_like_official_codex() -> bool {
    std::env::current_exe()
        .ok()
        .map(|path| path.to_string_lossy().contains("/Codex.app/"))
        .unwrap_or(false)
}

fn path_looks_like_nested_app_binary(path: &Path) -> bool {
    path.to_string_lossy().contains(".app/Contents/MacOS/")
}

fn output_snippet(output: &str) -> Option<String> {
    let compact = output.split_whitespace().collect::<Vec<_>>().join(" ");
    if compact.is_empty() {
        return None;
    }
    let snippet: String = compact
        .chars()
        .take(COMPUTER_USE_ACTIVATION_SNIPPET_LIMIT)
        .collect();
    if compact.chars().count() > COMPUTER_USE_ACTIVATION_SNIPPET_LIMIT {
        Some(format!("{snippet}..."))
    } else {
        Some(snippet)
    }
}

fn dedupe_guidance_codes(
    guidance_codes: Vec<ComputerUseGuidanceCode>,
) -> Vec<ComputerUseGuidanceCode> {
    let mut deduped = Vec::new();
    for code in guidance_codes {
        if !deduped.contains(&code) {
            deduped.push(code);
        }
    }
    deduped
}

fn resolve_computer_use_cache_root() -> Option<PathBuf> {
    codex_home::resolve_default_codex_home().map(|root| {
        root.join("plugins")
            .join("cache")
            .join("openai-bundled")
            .join(COMPUTER_USE_PLUGIN_NAME)
    })
}

fn detect_plugin_manifest_path(cache_root: Option<&Path>) -> Option<PathBuf> {
    let root = cache_root?;
    let entries = fs::read_dir(root).ok()?;
    entries
        .filter_map(Result::ok)
        .filter_map(|entry| {
            let file_type = entry.file_type().ok()?;
            if !file_type.is_dir() {
                return None;
            }
            let manifest_path = entry.path().join(".codex-plugin").join("plugin.json");
            manifest_path.is_file().then_some(manifest_path)
        })
        .max_by(|left, right| compare_plugin_manifest_paths(left, right))
}

fn compare_plugin_manifest_paths(left: &PathBuf, right: &PathBuf) -> Ordering {
    let left_numbers = plugin_manifest_version_numbers(left);
    let right_numbers = plugin_manifest_version_numbers(right);
    match compare_version_number_slices(&left_numbers, &right_numbers) {
        Ordering::Equal => {
            plugin_manifest_version_label(left).cmp(&plugin_manifest_version_label(right))
        }
        ordering => ordering,
    }
}

fn compare_version_number_slices(left: &[u64], right: &[u64]) -> Ordering {
    let max_len = left.len().max(right.len());
    for index in 0..max_len {
        let left_value = *left.get(index).unwrap_or(&0);
        let right_value = *right.get(index).unwrap_or(&0);
        match left_value.cmp(&right_value) {
            Ordering::Equal => {}
            ordering => return ordering,
        }
    }
    Ordering::Equal
}

fn plugin_manifest_version_label(path: &Path) -> String {
    path.parent()
        .and_then(Path::parent)
        .and_then(|version_dir| version_dir.file_name())
        .and_then(|value| value.to_str())
        .map(|value| value.to_string())
        .unwrap_or_default()
}

fn plugin_manifest_version_numbers(path: &Path) -> Vec<u64> {
    let label = plugin_manifest_version_label(path);
    let mut numbers = Vec::new();
    let mut digits = String::new();

    for character in label.chars() {
        if character.is_ascii_digit() {
            digits.push(character);
            continue;
        }
        if !digits.is_empty() {
            if let Ok(value) = digits.parse::<u64>() {
                numbers.push(value);
            }
            digits.clear();
        }
    }

    if !digits.is_empty() {
        if let Ok(value) = digits.parse::<u64>() {
            numbers.push(value);
        }
    }

    numbers
}

fn read_plugin_enabled_from_config(path: &Path) -> Result<Option<bool>, String> {
    if !path.exists() {
        return Ok(None);
    }
    let contents = fs::read_to_string(path)
        .map_err(|error| format!("failed to read codex config {}: {error}", path.display()))?;
    let parsed: toml::Value = toml::from_str(&contents)
        .map_err(|error| format!("failed to parse codex config {}: {error}", path.display()))?;

    Ok(parsed
        .get("plugins")
        .and_then(|value| value.as_table())
        .and_then(|plugins| plugins.get(COMPUTER_USE_PLUGIN_ID))
        .and_then(|plugin| plugin.as_table())
        .and_then(|plugin| plugin.get("enabled"))
        .and_then(|value| value.as_bool()))
}

fn path_to_string(path: PathBuf) -> Option<String> {
    path.to_str().map(|value| value.to_string())
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct ComputerUseHelperDescriptor {
    command_path: PathBuf,
    args: Vec<String>,
    current_dir: PathBuf,
}

pub(crate) fn parse_helper_command_path(path: &Path) -> Option<String> {
    parse_helper_descriptor(path).and_then(|descriptor| path_to_string(descriptor.command_path))
}

fn parse_helper_descriptor(path: &Path) -> Option<ComputerUseHelperDescriptor> {
    let contents = fs::read_to_string(path).ok()?;
    let payload: serde_json::Value = serde_json::from_str(&contents).ok()?;
    let servers = payload
        .get("mcpServers")
        .and_then(|value| value.as_object())?;
    let server = servers.get(COMPUTER_USE_MCP_SERVER_NAME).or_else(|| {
        (servers.len() == 1)
            .then(|| servers.values().next())
            .flatten()
    })?;

    let descriptor_dir = path.parent()?;
    let current_dir = server
        .get("cwd")
        .and_then(|value| value.as_str())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
        .map(|cwd| {
            if cwd.is_absolute() {
                cwd
            } else {
                descriptor_dir.join(cwd)
            }
        })
        .unwrap_or_else(|| descriptor_dir.to_path_buf());

    let command_value = server
        .get("command")
        .and_then(|value| value.as_str())
        .map(str::trim)
        .filter(|value| !value.is_empty())?;
    let command = PathBuf::from(command_value);
    let command_path = if command.is_absolute() {
        command
    } else {
        normalize_path(current_dir.join(command))
    };

    let args = match server.get("args") {
        Some(value) => value
            .as_array()?
            .iter()
            .map(|item| item.as_str().map(ToOwned::to_owned))
            .collect::<Option<Vec<_>>>()?,
        None => Vec::new(),
    };

    Some(ComputerUseHelperDescriptor {
        command_path,
        args,
        current_dir,
    })
}

fn normalize_path(path: PathBuf) -> PathBuf {
    path.components()
        .fold(PathBuf::new(), |mut normalized, component| {
            normalized.push(component.as_os_str());
            normalized
        })
}

impl ComputerUseActivationVerification {
    fn from_snapshot(snapshot: &ComputerUseDetectionSnapshot) -> Option<Self> {
        Some(Self {
            helper_identity: ComputerUseActivationIdentity::from_snapshot(snapshot)?,
        })
    }

    fn applies_to(&self, snapshot: &ComputerUseDetectionSnapshot) -> bool {
        self.helper_identity.matches_snapshot(snapshot)
    }
}

impl ComputerUseActivationIdentity {
    fn from_snapshot(snapshot: &ComputerUseDetectionSnapshot) -> Option<Self> {
        Some(Self {
            helper_path: snapshot.helper_path.clone()?,
            helper_descriptor_path: snapshot.helper_descriptor_path.clone(),
            plugin_manifest_path: snapshot.plugin_manifest_path.clone(),
        })
    }

    fn matches_snapshot(&self, snapshot: &ComputerUseDetectionSnapshot) -> bool {
        snapshot.helper_path.as_deref() == Some(self.helper_path.as_str())
            && snapshot.helper_descriptor_path == self.helper_descriptor_path
            && snapshot.plugin_manifest_path == self.plugin_manifest_path
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn supported_snapshot() -> ComputerUseDetectionSnapshot {
        ComputerUseDetectionSnapshot {
            codex_app_detected: true,
            plugin_detected: true,
            plugin_enabled: true,
            helper_present: true,
            helper_bridge_verified: true,
            permission_verified: true,
            approval_verified: true,
            ..ComputerUseDetectionSnapshot::default()
        }
    }

    fn blocked_bridge_status(
        blocked_reasons: Vec<ComputerUseBlockedReason>,
    ) -> ComputerUseBridgeStatus {
        ComputerUseBridgeStatus {
            feature_enabled: true,
            activation_enabled: true,
            status: if blocked_reasons.is_empty() {
                ComputerUseAvailabilityStatus::Ready
            } else {
                ComputerUseAvailabilityStatus::Blocked
            },
            platform: "macos".to_string(),
            codex_app_detected: true,
            plugin_detected: true,
            plugin_enabled: true,
            blocked_reasons,
            guidance_codes: Vec::new(),
            codex_config_path: Some("/Users/demo/.codex/config.toml".to_string()),
            plugin_manifest_path: Some(
                "/Users/demo/.codex/plugins/cache/openai-bundled/computer-use/1/.codex-plugin/plugin.json"
                    .to_string(),
            ),
            helper_path: Some(
                "/Applications/Codex.app/Contents/Resources/plugins/openai-bundled/plugins/computer-use/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient"
                    .to_string(),
            ),
            helper_descriptor_path: Some(
                "/Applications/Codex.app/Contents/Resources/plugins/openai-bundled/plugins/computer-use/.mcp.json"
                    .to_string(),
            ),
            marketplace_path: Some(
                "/Applications/Codex.app/Contents/Resources/plugins/openai-bundled/.agents/plugins/marketplace.json"
                    .to_string(),
            ),
            diagnostic_message: None,
        }
    }

    #[test]
    fn unsupported_takes_precedence() {
        let (status, reasons, guidance) =
            classify_status(PlatformAvailability::Unsupported, &supported_snapshot());

        assert_eq!(status, ComputerUseAvailabilityStatus::Unsupported);
        assert_eq!(reasons, vec![ComputerUseBlockedReason::PlatformUnsupported]);
        assert_eq!(guidance, vec![ComputerUseGuidanceCode::UnsupportedPlatform]);
    }

    #[test]
    fn missing_codex_app_is_unavailable() {
        let (status, reasons, _) = classify_status(
            PlatformAvailability::Supported,
            &ComputerUseDetectionSnapshot::default(),
        );

        assert_eq!(status, ComputerUseAvailabilityStatus::Unavailable);
        assert_eq!(reasons, vec![ComputerUseBlockedReason::CodexAppMissing]);
    }

    #[test]
    fn missing_plugin_is_unavailable() {
        let snapshot = ComputerUseDetectionSnapshot {
            codex_app_detected: true,
            ..ComputerUseDetectionSnapshot::default()
        };
        let (status, reasons, _) = classify_status(PlatformAvailability::Supported, &snapshot);

        assert_eq!(status, ComputerUseAvailabilityStatus::Unavailable);
        assert_eq!(reasons, vec![ComputerUseBlockedReason::PluginMissing]);
    }

    #[test]
    fn disabled_plugin_is_blocked() {
        let snapshot = ComputerUseDetectionSnapshot {
            codex_app_detected: true,
            plugin_detected: true,
            plugin_enabled: false,
            ..ComputerUseDetectionSnapshot::default()
        };
        let (status, reasons, _) = classify_status(PlatformAvailability::Supported, &snapshot);

        assert_eq!(status, ComputerUseAvailabilityStatus::Blocked);
        assert_eq!(reasons, vec![ComputerUseBlockedReason::PluginDisabled]);
    }

    #[test]
    fn missing_helper_is_blocked() {
        let snapshot = ComputerUseDetectionSnapshot {
            codex_app_detected: true,
            plugin_detected: true,
            plugin_enabled: true,
            helper_present: false,
            ..ComputerUseDetectionSnapshot::default()
        };
        let (status, reasons, _) = classify_status(PlatformAvailability::Supported, &snapshot);

        assert_eq!(status, ComputerUseAvailabilityStatus::Blocked);
        assert_eq!(reasons, vec![ComputerUseBlockedReason::HelperMissing]);
    }

    #[test]
    fn unverified_helper_is_blocked_instead_of_ready() {
        let snapshot = ComputerUseDetectionSnapshot {
            helper_bridge_verified: false,
            permission_verified: false,
            approval_verified: false,
            ..supported_snapshot()
        };
        let (status, reasons, guidance) =
            classify_status(PlatformAvailability::Supported, &snapshot);

        assert_eq!(status, ComputerUseAvailabilityStatus::Blocked);
        assert_eq!(
            reasons,
            vec![
                ComputerUseBlockedReason::HelperBridgeUnverified,
                ComputerUseBlockedReason::PermissionRequired,
                ComputerUseBlockedReason::ApprovalRequired,
            ]
        );
        assert_eq!(
            guidance,
            vec![
                ComputerUseGuidanceCode::VerifyHelperBridge,
                ComputerUseGuidanceCode::GrantSystemPermissions,
                ComputerUseGuidanceCode::ReviewAllowedApps,
            ]
        );
    }

    #[test]
    fn activation_probe_requires_helper_bridge_unverified() {
        let status = blocked_bridge_status(vec![
            ComputerUseBlockedReason::HelperBridgeUnverified,
            ComputerUseBlockedReason::PermissionRequired,
            ComputerUseBlockedReason::ApprovalRequired,
        ]);

        assert!(is_activation_probe_eligible(&status));

        let verified_status = blocked_bridge_status(vec![
            ComputerUseBlockedReason::PermissionRequired,
            ComputerUseBlockedReason::ApprovalRequired,
        ]);

        assert!(!is_activation_probe_eligible(&verified_status));
    }

    #[test]
    fn activation_probe_requires_enabled_kill_switch() {
        let mut status = blocked_bridge_status(vec![
            ComputerUseBlockedReason::HelperBridgeUnverified,
            ComputerUseBlockedReason::PermissionRequired,
            ComputerUseBlockedReason::ApprovalRequired,
        ]);
        status.activation_enabled = false;

        assert!(!is_activation_probe_eligible(&status));
    }

    #[test]
    fn activation_disabled_env_accepts_common_truthy_values() {
        assert!(activation_disabled_env_value(Some("1".to_string())));
        assert!(activation_disabled_env_value(Some("true".to_string())));
        assert!(activation_disabled_env_value(Some(" YES ".to_string())));
        assert!(activation_disabled_env_value(Some("on".to_string())));
        assert!(!activation_disabled_env_value(None));
        assert!(!activation_disabled_env_value(Some("false".to_string())));
        assert!(!activation_disabled_env_value(Some("0".to_string())));
    }

    #[test]
    fn activation_verification_merges_only_for_matching_helper_identity() {
        let mut snapshot = ComputerUseDetectionSnapshot {
            codex_app_detected: true,
            plugin_detected: true,
            plugin_enabled: true,
            helper_present: true,
            helper_bridge_verified: false,
            permission_verified: false,
            approval_verified: false,
            helper_path: Some("/tmp/helper-a".to_string()),
            helper_descriptor_path: Some("/tmp/.mcp.json".to_string()),
            plugin_manifest_path: Some("/tmp/plugin.json".to_string()),
            ..ComputerUseDetectionSnapshot::default()
        };
        let verification =
            ComputerUseActivationVerification::from_snapshot(&snapshot).expect("verification");

        apply_activation_verification(&mut snapshot, Some(&verification));
        assert!(snapshot.helper_bridge_verified);

        let mut changed_snapshot = ComputerUseDetectionSnapshot {
            helper_bridge_verified: false,
            helper_path: Some("/tmp/helper-b".to_string()),
            helper_descriptor_path: Some("/tmp/.mcp.json".to_string()),
            plugin_manifest_path: Some("/tmp/plugin.json".to_string()),
            ..snapshot.clone()
        };

        apply_activation_verification(&mut changed_snapshot, Some(&verification));
        assert!(!changed_snapshot.helper_bridge_verified);
    }

    #[test]
    fn parse_helper_command_path_resolves_relative_command_against_descriptor_cwd() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos();
        let root = std::env::temp_dir().join(format!("computer-use-helper-{unique}"));
        let descriptor_dir = root.join("plugins").join("computer-use");
        fs::create_dir_all(&descriptor_dir).expect("create descriptor directory");

        let descriptor_path = descriptor_dir.join(".mcp.json");
        fs::write(
            &descriptor_path,
            r#"{
  "mcpServers": {
    "computer-use": {
      "command": "./Codex Computer Use.app/Contents/MacOS/Client",
      "args": ["mcp"],
      "cwd": "."
    }
  }
}"#,
        )
        .expect("write descriptor");

        let descriptor = parse_helper_descriptor(&descriptor_path).expect("helper descriptor");
        assert_eq!(descriptor.args, vec!["mcp"]);
        let resolved = parse_helper_command_path(&descriptor_path).expect("helper path");
        assert_eq!(
            PathBuf::from(resolved),
            descriptor_dir
                .join("Codex Computer Use.app")
                .join("Contents")
                .join("MacOS")
                .join("Client")
        );

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn parse_helper_descriptor_prefers_named_computer_use_server() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos();
        let root = std::env::temp_dir().join(format!("computer-use-named-server-{unique}"));
        let descriptor_dir = root.join("plugins").join("computer-use");
        fs::create_dir_all(&descriptor_dir).expect("create descriptor directory");

        let descriptor_path = descriptor_dir.join(".mcp.json");
        fs::write(
            &descriptor_path,
            r#"{
  "mcpServers": {
    "other": {
      "command": "./Wrong.app/Contents/MacOS/Wrong",
      "args": ["wrong"],
      "cwd": "."
    },
    "computer-use": {
      "command": "./Codex Computer Use.app/Contents/MacOS/Client",
      "args": ["mcp"],
      "cwd": "."
    }
  }
}"#,
        )
        .expect("write descriptor");

        let descriptor = parse_helper_descriptor(&descriptor_path).expect("helper descriptor");
        assert_eq!(descriptor.args, vec!["mcp"]);
        assert_eq!(
            descriptor.command_path,
            descriptor_dir
                .join("Codex Computer Use.app")
                .join("Contents")
                .join("MacOS")
                .join("Client")
        );

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn parse_helper_descriptor_rejects_ambiguous_or_invalid_launch_contracts() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos();
        let root = std::env::temp_dir().join(format!("computer-use-invalid-contract-{unique}"));
        let descriptor_dir = root.join("plugins").join("computer-use");
        fs::create_dir_all(&descriptor_dir).expect("create descriptor directory");
        let descriptor_path = descriptor_dir.join(".mcp.json");

        fs::write(
            &descriptor_path,
            r#"{
  "mcpServers": {
    "other": { "command": "./Other", "args": [], "cwd": "." },
    "another": { "command": "./Another", "args": [], "cwd": "." }
  }
}"#,
        )
        .expect("write ambiguous descriptor");
        assert!(parse_helper_descriptor(&descriptor_path).is_none());

        fs::write(
            &descriptor_path,
            r#"{
  "mcpServers": {
    "computer-use": { "command": "  ", "args": ["mcp"], "cwd": "." }
  }
}"#,
        )
        .expect("write empty command descriptor");
        assert!(parse_helper_descriptor(&descriptor_path).is_none());

        fs::write(
            &descriptor_path,
            r#"{
  "mcpServers": {
    "computer-use": { "command": "./Client", "args": ["mcp", 1], "cwd": "." }
  }
}"#,
        )
        .expect("write invalid args descriptor");
        assert!(parse_helper_descriptor(&descriptor_path).is_none());

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn diagnostics_only_probe_detects_nested_app_binary() {
        let path = PathBuf::from(
            "/Applications/Codex.app/Contents/Resources/plugins/openai-bundled/plugins/computer-use/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient",
        );

        assert!(path_looks_like_nested_app_binary(&path));
    }

    #[test]
    fn detect_plugin_manifest_path_prefers_highest_semver_directory() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos();
        let root = std::env::temp_dir().join(format!("computer-use-cache-{unique}"));
        let lower = root.join("1.9.0").join(".codex-plugin");
        let higher = root.join("1.10.0").join(".codex-plugin");
        fs::create_dir_all(&lower).expect("create lower version directory");
        fs::create_dir_all(&higher).expect("create higher version directory");
        fs::write(lower.join("plugin.json"), "{}").expect("write lower plugin manifest");
        fs::write(higher.join("plugin.json"), "{}").expect("write higher plugin manifest");

        let detected = detect_plugin_manifest_path(Some(&root)).expect("manifest path");
        assert_eq!(detected, higher.join("plugin.json"));

        let _ = fs::remove_dir_all(root);
    }
}

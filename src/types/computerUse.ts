export type ComputerUseAvailabilityStatus =
  | "ready"
  | "blocked"
  | "unavailable"
  | "unsupported";

export type ComputerUseBlockedReason =
  | "platform_unsupported"
  | "codex_app_missing"
  | "plugin_missing"
  | "plugin_disabled"
  | "helper_missing"
  | "helper_bridge_unverified"
  | "permission_required"
  | "approval_required"
  | "unknown_prerequisite";

export type ComputerUseGuidanceCode =
  | "unsupported_platform"
  | "install_codex_app"
  | "install_official_plugin"
  | "enable_official_plugin"
  | "verify_helper_installation"
  | "verify_helper_bridge"
  | "grant_system_permissions"
  | "review_allowed_apps"
  | "inspect_official_codex_setup";

export type ComputerUseBridgeStatus = {
  featureEnabled: boolean;
  activationEnabled: boolean;
  status: ComputerUseAvailabilityStatus;
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
  authorizationContinuity: ComputerUseAuthorizationContinuityStatus;
};

export type ComputerUseAuthorizationBackendMode = "local" | "remote";

export type ComputerUseAuthorizationHostRole =
  | "foreground_app"
  | "daemon"
  | "debug_binary"
  | "unknown";

export type ComputerUseAuthorizationLaunchMode =
  | "packaged_app"
  | "daemon"
  | "debug"
  | "unknown";

export type ComputerUseAuthorizationContinuityKind =
  | "unknown"
  | "no_successful_host"
  | "matching_host"
  | "host_drift_detected"
  | "unsupported_context";

export type ComputerUseAuthorizationHostSnapshot = {
  displayName: string;
  executablePath: string;
  identifier: string | null;
  teamIdentifier: string | null;
  backendMode: ComputerUseAuthorizationBackendMode;
  hostRole: ComputerUseAuthorizationHostRole;
  launchMode: ComputerUseAuthorizationLaunchMode;
  signingSummary: string | null;
};

export type ComputerUseAuthorizationContinuityStatus = {
  kind: ComputerUseAuthorizationContinuityKind;
  diagnosticMessage: string | null;
  currentHost: ComputerUseAuthorizationHostSnapshot | null;
  lastSuccessfulHost: ComputerUseAuthorizationHostSnapshot | null;
  driftFields: string[];
};

export type ComputerUseActivationOutcome = "verified" | "blocked" | "failed";

export type ComputerUseActivationFailureKind =
  | "activation_disabled"
  | "unsupported_platform"
  | "ineligible_host"
  | "host_incompatible"
  | "already_running"
  | "remaining_blockers"
  | "timeout"
  | "launch_failed"
  | "non_zero_exit"
  | "unknown";

export type ComputerUseActivationResult = {
  outcome: ComputerUseActivationOutcome;
  failureKind: ComputerUseActivationFailureKind | null;
  bridgeStatus: ComputerUseBridgeStatus;
  durationMs: number;
  diagnosticMessage: string | null;
  stderrSnippet: string | null;
  exitCode: number | null;
};

export type ComputerUseHostContractDiagnosticsKind =
  | "requires_official_parent"
  | "handoff_unavailable"
  | "handoff_verified"
  | "manual_permission_required"
  | "unknown";

export type ComputerUseOfficialParentHandoffKind =
  | "handoff_candidate_found"
  | "handoff_unavailable"
  | "requires_official_parent"
  | "unknown";

export type ComputerUseOfficialParentHandoffMethod = {
  method: string;
  sourcePath: string | null;
  identifier: string;
  confidence: string;
  notes: string;
};

export type ComputerUseOfficialParentHandoffEvidence = {
  codexInfoPlistPath: string | null;
  serviceInfoPlistPath: string | null;
  helperInfoPlistPath: string | null;
  parentCodeRequirementPath: string | null;
  pluginManifestPath: string | null;
  mcpDescriptorPath: string | null;
  codexUrlSchemes: string[];
  serviceBundleIdentifier: string | null;
  helperBundleIdentifier: string | null;
  parentTeamIdentifier: string | null;
  applicationGroups: string[];
  xpcServiceIdentifiers: string[];
  durationMs: number;
  stdoutSnippet: string | null;
  stderrSnippet: string | null;
};

export type ComputerUseOfficialParentHandoffDiscovery = {
  kind: ComputerUseOfficialParentHandoffKind;
  methods: ComputerUseOfficialParentHandoffMethod[];
  evidence: ComputerUseOfficialParentHandoffEvidence;
  durationMs: number;
  diagnosticMessage: string;
};

export type ComputerUseHostContractEvidence = {
  helperPath: string | null;
  helperDescriptorPath: string | null;
  currentHostPath: string | null;
  handoffMethod: string;
  codesignSummary: string | null;
  spctlSummary: string | null;
  durationMs: number;
  stdoutSnippet: string | null;
  stderrSnippet: string | null;
  officialParentHandoff: ComputerUseOfficialParentHandoffDiscovery;
};

export type ComputerUseHostContractDiagnosticsResult = {
  kind: ComputerUseHostContractDiagnosticsKind;
  bridgeStatus: ComputerUseBridgeStatus;
  evidence: ComputerUseHostContractEvidence;
  durationMs: number;
  diagnosticMessage: string;
};

export type ComputerUseBrokerOutcome = "completed" | "blocked" | "failed";

export type ComputerUseBrokerFailureKind =
  | "unsupported_platform"
  | "bridge_unavailable"
  | "bridge_blocked"
  | "authorization_continuity_blocked"
  | "workspace_missing"
  | "codex_runtime_unavailable"
  | "already_running"
  | "invalid_instruction"
  | "permission_required"
  | "timeout"
  | "codex_error"
  | "unknown";

export type ComputerUseBrokerRequest = {
  workspaceId: string;
  instruction: string;
  model?: string | null;
  effort?: string | null;
};

export type ComputerUseBrokerResult = {
  outcome: ComputerUseBrokerOutcome;
  failureKind: ComputerUseBrokerFailureKind | null;
  bridgeStatus: ComputerUseBridgeStatus;
  text: string | null;
  diagnosticMessage: string | null;
  durationMs: number;
};


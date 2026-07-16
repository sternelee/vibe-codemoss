import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import LayoutList from "lucide-react/dist/esm/icons/layout-list";
import PackagePlus from "lucide-react/dist/esm/icons/package-plus";
import type { CodexCustomModel, CodexProviderConfig, VendorTab } from "../types";
import { STORAGE_KEYS, validateCodexCustomModels } from "../types";
import type { AppSettings, CodexUnifiedExecExternalStatus } from "../../../types";
import { useProviderManagement } from "../hooks/useProviderManagement";
import { useCodexProviderManagement } from "../hooks/useCodexProviderManagement";
import { usePluginModels } from "../hooks/usePluginModels";
import { ProviderList } from "./ProviderList";
import { CodexProviderList } from "./CodexProviderList";
import { ProviderDialog } from "./ProviderDialog";
import { CodexProviderDialog } from "./CodexProviderDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { CustomModelDialog } from "./CustomModelDialog";
import { CurrentCodexGlobalConfigCard } from "./CurrentCodexGlobalConfigCard";
import { buildCliEngineNavItems, CliIcon, type CliEngineNavItem } from "./cliEngineNav";
import {
  consumeVendorModelManagerRequest,
  VENDOR_MODEL_MANAGER_REQUEST_EVENT,
} from "../modelManagerRequest";
import {
  getCodexUnifiedExecExternalStatus,
  readGlobalCodexAuthJson,
  readGlobalCodexConfigToml,
  restoreCodexUnifiedExecOfficialDefault,
  setCodexUnifiedExecOfficialOverride,
} from "../../../services/tauri";
import { pushErrorToast } from "../../../services/toasts";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const LEGACY_CLAUDE_MAPPING_KEYS = [
  "mossx-claude-model-mapping",
  "codemoss-claude-model-mapping",
];
const CODEX_PLUGIN_MODELS_MIGRATION_MARKER =
  "codemoss-codex-plugin-models-migrated-v1";
type ModelDialogTarget = VendorTab;
type InlineNoticeState =
  | { kind: "success" | "error"; message: string }
  | null;

type VendorSettingsPanelProps = {
  appSettings: AppSettings;
  codexReloadStatus: "idle" | "reloading" | "applied" | "failed";
  codexReloadMessage: string | null;
  handleReloadCodexRuntimeConfig: () => Promise<void>;
  onUpdateAppSettings: (next: AppSettings) => Promise<void>;
};

function collectProviderCustomModels(
  providers: CodexProviderConfig[],
): CodexCustomModel[] {
  const merged: CodexCustomModel[] = [];
  const seenIds = new Set<string>();

  for (const provider of providers) {
    const models = validateCodexCustomModels(provider.customModels ?? []);
    for (const model of models) {
      const id = model.id.trim();
      if (!id || seenIds.has(id)) {
        continue;
      }
      seenIds.add(id);
      const label = model.label?.trim() || id;
      const description = model.description?.trim();
      merged.push({
        id,
        label,
        description: description && description.length > 0 ? description : undefined,
      });
    }
  }

  return merged;
}

export function VendorSettingsPanel({
  appSettings,
  codexReloadStatus,
  codexReloadMessage,
  handleReloadCodexRuntimeConfig,
  onUpdateAppSettings,
}: VendorSettingsPanelProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<VendorTab>("claude");
  const [dialogTarget, setDialogTarget] = useState<ModelDialogTarget>("claude");
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [modelDialogAddMode, setModelDialogAddMode] = useState(false);
  const [codexGlobalConfigContent, setCodexGlobalConfigContent] = useState("");
  const [codexGlobalConfigExists, setCodexGlobalConfigExists] = useState(false);
  const [codexGlobalConfigTruncated, setCodexGlobalConfigTruncated] = useState(false);
  const [codexGlobalConfigLoading, setCodexGlobalConfigLoading] = useState(false);
  const [codexGlobalConfigError, setCodexGlobalConfigError] = useState<string | null>(null);
  const [codexAuthConfigContent, setCodexAuthConfigContent] = useState("");
  const [codexAuthConfigExists, setCodexAuthConfigExists] = useState(false);
  const [codexAuthConfigTruncated, setCodexAuthConfigTruncated] = useState(false);
  const [codexAuthConfigLoading, setCodexAuthConfigLoading] = useState(false);
  const [codexAuthConfigError, setCodexAuthConfigError] = useState<string | null>(null);
  const [unifiedExecExternalStatus, setUnifiedExecExternalStatus] =
    useState<CodexUnifiedExecExternalStatus | null>(null);
  const [unifiedExecExternalStatusError, setUnifiedExecExternalStatusError] =
    useState<string | null>(null);
  const [unifiedExecExternalStatusLoading, setUnifiedExecExternalStatusLoading] =
    useState(false);
  const [unifiedExecActionBusy, setUnifiedExecActionBusy] = useState(false);
  const [unifiedExecActionNotice, setUnifiedExecActionNotice] =
    useState<InlineNoticeState>(null);
  const didRunLegacyMigrationRef = useRef(false);
  const didSeedCodexPluginModelsRef = useRef(false);

  const claude = useProviderManagement();
  const codex = useCodexProviderManagement();
  const claudeModels = usePluginModels(STORAGE_KEYS.CLAUDE_CUSTOM_MODELS);
  const codexModels = usePluginModels(STORAGE_KEYS.CODEX_CUSTOM_MODELS);
  const codexModelCount = codexModels.models.length;
  const updateCodexModels = codexModels.updateModels;

  const openModelDialog = useCallback((target: ModelDialogTarget, addMode = false) => {
    setDialogTarget(target);
    setModelDialogAddMode(addMode);
    setModelDialogOpen(true);
  }, []);

  const closeModelDialog = useCallback(() => {
    setModelDialogOpen(false);
    setModelDialogAddMode(false);
  }, []);

  const loadCodexGlobalConfig = useCallback(async () => {
    setCodexGlobalConfigLoading(true);
    setCodexAuthConfigLoading(true);
    setCodexGlobalConfigError(null);
    setCodexAuthConfigError(null);
    const [configResult, authResult] = await Promise.allSettled([
      readGlobalCodexConfigToml(),
      readGlobalCodexAuthJson(),
    ]);

    if (configResult.status === "fulfilled") {
      setCodexGlobalConfigContent(configResult.value.content);
      setCodexGlobalConfigExists(configResult.value.exists);
      setCodexGlobalConfigTruncated(configResult.value.truncated);
    } else {
      const error = configResult.reason;
      setCodexGlobalConfigError(
        error instanceof Error ? error.message : String(error),
      );
      setCodexGlobalConfigContent("");
      setCodexGlobalConfigExists(false);
      setCodexGlobalConfigTruncated(false);
    }
    setCodexGlobalConfigLoading(false);

    if (authResult.status === "fulfilled") {
      setCodexAuthConfigContent(authResult.value.content);
      setCodexAuthConfigExists(authResult.value.exists);
      setCodexAuthConfigTruncated(authResult.value.truncated);
    } else {
      const error = authResult.reason;
      setCodexAuthConfigError(error instanceof Error ? error.message : String(error));
      setCodexAuthConfigContent("");
      setCodexAuthConfigExists(false);
      setCodexAuthConfigTruncated(false);
    }
    setCodexAuthConfigLoading(false);
  }, []);

  const refreshUnifiedExecExternalStatus = useCallback(async () => {
    setUnifiedExecExternalStatusLoading(true);
    setUnifiedExecExternalStatusError(null);
    try {
      const status = await getCodexUnifiedExecExternalStatus();
      setUnifiedExecExternalStatus(status);
      return status;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setUnifiedExecExternalStatusError(message);
      return null;
    } finally {
      setUnifiedExecExternalStatusLoading(false);
    }
  }, []);

  const refreshUnifiedExecConfigViews = useCallback(async () => {
    await Promise.all([loadCodexGlobalConfig(), refreshUnifiedExecExternalStatus()]);
  }, [loadCodexGlobalConfig, refreshUnifiedExecExternalStatus]);

  const applyPendingModelManagerRequest = useCallback(() => {
    const request = consumeVendorModelManagerRequest();
    if (!request) {
      return;
    }
    const target: ModelDialogTarget =
      request.target === "codex"
        ? "codex"
        : "claude";
    setActiveTab(target);
    openModelDialog(target, Boolean(request.addMode));
  }, [openModelDialog]);

  useEffect(() => {
    applyPendingModelManagerRequest();
    const handleRequest = () => applyPendingModelManagerRequest();
    window.addEventListener(VENDOR_MODEL_MANAGER_REQUEST_EVENT, handleRequest);
    return () => {
      window.removeEventListener(
        VENDOR_MODEL_MANAGER_REQUEST_EVENT,
        handleRequest,
      );
    };
  }, [applyPendingModelManagerRequest]);

  useEffect(() => {
    void loadCodexGlobalConfig();
  }, [loadCodexGlobalConfig]);

  useEffect(() => {
    if (activeTab !== "codex") {
      return;
    }
    void refreshUnifiedExecExternalStatus();
  }, [activeTab, refreshUnifiedExecExternalStatus]);

  useEffect(() => {
    if (didRunLegacyMigrationRef.current) {
      return;
    }
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    const canonicalKey = STORAGE_KEYS.CLAUDE_MODEL_MAPPING;
    const hasCanonical = Boolean(window.localStorage.getItem(canonicalKey));
    if (hasCanonical) {
      didRunLegacyMigrationRef.current = true;
      return;
    }

    for (const legacyKey of LEGACY_CLAUDE_MAPPING_KEYS) {
      const value = window.localStorage.getItem(legacyKey);
      if (!value) {
        continue;
      }
      try {
        window.localStorage.setItem(canonicalKey, value);
        window.dispatchEvent(
          new CustomEvent("localStorageChange", {
            detail: { key: canonicalKey },
          }),
        );
      } catch {
        // ignore migration write errors
      }
      break;
    }
    didRunLegacyMigrationRef.current = true;
  }, []);

  useEffect(() => {
    if (didSeedCodexPluginModelsRef.current) {
      return;
    }
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    const alreadyMigrated =
      window.localStorage.getItem(CODEX_PLUGIN_MODELS_MIGRATION_MARKER) === "1";
    if (alreadyMigrated) {
      didSeedCodexPluginModelsRef.current = true;
      return;
    }
    if (codexModelCount > 0) {
      try {
        window.localStorage.setItem(CODEX_PLUGIN_MODELS_MIGRATION_MARKER, "1");
      } catch {
        // ignore marker write errors
      }
      didSeedCodexPluginModelsRef.current = true;
      return;
    }
    if (codex.codexProviders.length === 0) {
      return;
    }

    const fallbackModels = collectProviderCustomModels(codex.codexProviders);
    if (fallbackModels.length === 0) {
      try {
        window.localStorage.setItem(CODEX_PLUGIN_MODELS_MIGRATION_MARKER, "1");
      } catch {
        // ignore marker write errors
      }
      didSeedCodexPluginModelsRef.current = true;
      return;
    }

    updateCodexModels(fallbackModels);
    try {
      window.localStorage.setItem(CODEX_PLUGIN_MODELS_MIGRATION_MARKER, "1");
    } catch {
      // ignore marker write errors
    }
    didSeedCodexPluginModelsRef.current = true;
  }, [codex.codexProviders, codexModelCount, updateCodexModels]);

  useEffect(() => {
    if (!unifiedExecActionNotice) {
      return;
    }
    const timer = window.setTimeout(() => {
      setUnifiedExecActionNotice(null);
    }, 2600);
    return () => window.clearTimeout(timer);
  }, [unifiedExecActionNotice]);

  const runUnifiedExecOfficialAction = useCallback(
    async (
      mutate: () => Promise<CodexUnifiedExecExternalStatus>,
      successMessageKey: string,
    ) => {
      setUnifiedExecActionBusy(true);
      setUnifiedExecActionNotice(null);
      try {
        const status = await mutate();
        setUnifiedExecExternalStatus(status);
        try {
          await handleReloadCodexRuntimeConfig();
          setUnifiedExecActionNotice({
            kind: "success",
            message: t(successMessageKey),
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const reloadFailureMessage = t(
            "settings.backgroundTerminalOfficialWriteReloadFailed",
            { message },
          );
          setUnifiedExecActionNotice({
            kind: "error",
            message: reloadFailureMessage,
          });
          pushErrorToast({
            title: t("common.error"),
            message: reloadFailureMessage,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setUnifiedExecActionNotice({ kind: "error", message });
        pushErrorToast({
          title: t("common.error"),
          message,
        });
      } finally {
        await refreshUnifiedExecConfigViews();
        setUnifiedExecActionBusy(false);
      }
    },
    [handleReloadCodexRuntimeConfig, refreshUnifiedExecConfigViews, t],
  );

  const handleSetUnifiedExecOfficialOverride = useCallback(
    async (enabled: boolean) => {
      await runUnifiedExecOfficialAction(
        () => setCodexUnifiedExecOfficialOverride(enabled),
        enabled
          ? "settings.backgroundTerminalOfficialWriteEnabledSuccess"
          : "settings.backgroundTerminalOfficialWriteDisabledSuccess",
      );
    },
    [runUnifiedExecOfficialAction],
  );

  const handleRestoreUnifiedExecOfficialDefault = useCallback(async () => {
    await runUnifiedExecOfficialAction(
      () => restoreCodexUnifiedExecOfficialDefault(),
      "settings.backgroundTerminalFollowOfficialSuccess",
    );
  }, [runUnifiedExecOfficialAction]);

  const unifiedExecOfficialDefaultDetail = unifiedExecExternalStatus
    ? unifiedExecExternalStatus.officialDefaultEnabled
      ? t("settings.backgroundTerminalDefaultEnabled")
      : t("settings.backgroundTerminalDefaultDisabled")
    : null;
  const unifiedExecOfficialConfigDetail = !unifiedExecExternalStatus
    ? null
    : !unifiedExecExternalStatus.hasExplicitUnifiedExec
      ? t("settings.backgroundTerminalOfficialConfigDefault")
      : unifiedExecExternalStatus.explicitUnifiedExecValue === true
        ? t("settings.backgroundTerminalOfficialConfigEnabled")
        : unifiedExecExternalStatus.explicitUnifiedExecValue === false
          ? t("settings.backgroundTerminalOfficialConfigDisabled")
          : t("settings.backgroundTerminalOfficialConfigInvalid");

  const currentDialogModels =
    dialogTarget === "codex"
      ? codexModels.models
      : claudeModels.models;

  const handleDialogModelsChange = useCallback(
    (models: CodexCustomModel[]) => {
      if (dialogTarget === "codex") {
        codexModels.updateModels(models);
        return;
      }
      claudeModels.updateModels(models);
    },
    [claudeModels, codexModels, dialogTarget],
  );

  const handleUnsupportedCliClick = useCallback(
    (label: string) => {
      pushErrorToast({
        title: label,
        message: t("settings.vendor.cliComingSoon"),
        variant: "info",
      });
    },
    [t],
  );

  const engineNavItems: CliEngineNavItem[] = buildCliEngineNavItems({
    claudeHasConfig: Boolean(claude.currentConfig),
    codexHasConfig: codexGlobalConfigExists,
  });

  return (
    <div
      className={cn(
        "vendor-settings-panel",
        "flex items-start",
        "-ml-[var(--settings-content-pad-x)]",
        "max-md:ml-0 max-md:flex-col",
      )}
    >
      <nav
        className={cn(
          "vendor-engine-nav vendor-engine-nav-scroll sticky top-0 flex shrink-0 flex-col self-start",
          "max-md:static max-md:w-full max-md:flex-row max-md:px-0",
        )}
        aria-label={t("settings.vendorsTitle")}
      >
        {engineNavItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={cn(
              "vendor-engine-tab flex w-full items-center text-left text-foreground transition-colors",
              "max-md:flex-1",
              item.supported && activeTab === item.key && "vendor-engine-tab-active",
              !item.supported && "vendor-engine-tab-disabled",
            )}
            aria-current={item.supported && activeTab === item.key ? "true" : undefined}
            aria-disabled={item.supported ? undefined : "true"}
            onClick={() => {
              if (item.supported) {
                setActiveTab(item.key);
                return;
              }
              handleUnsupportedCliClick(item.label);
            }}
          >
            <span className="vendor-engine-icon flex shrink-0 items-center justify-center border bg-background">
              <CliIcon id={item.key} label={item.label} />
            </span>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.supported && item.hasConfig ? (
              <span
                className="size-1.5 shrink-0 rounded-full bg-emerald-500"
                aria-hidden="true"
              />
            ) : null}
          </button>
        ))}
      </nav>

      <div className="vendor-settings-content min-w-0 flex-1">
        <div className="vendor-section-heading">
          <h3 className="vendor-section-title">{t("settings.vendorsTitle")}</h3>
          <p className="vendor-section-desc">
            {t("settings.vendorsDescription")}
          </p>
        </div>
        {activeTab === "claude" ? (
          <div className="vendor-tab-content">
            <ProviderList
              providers={claude.providers}
              loading={claude.loading}
              headerActions={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openModelDialog("claude")}
                >
                  <PackagePlus size={14} />
                  {t("settings.vendor.pluginModels")}
                  {claudeModels.models.length > 0 ? (
                    <span className="vendor-plugin-model-entry-count">
                      {claudeModels.models.length}
                    </span>
                  ) : null}
                </Button>
              }
              onAdd={claude.handleAddProvider}
              onEdit={claude.handleEditProvider}
              onDelete={claude.handleDeleteProvider}
              onSwitch={claude.handleSwitchProvider}
              onReorder={claude.handleReorderProviders}
            />
            <ProviderDialog
              isOpen={claude.providerDialog.isOpen}
              provider={claude.providerDialog.provider}
              onClose={claude.handleCloseProviderDialog}
              onSave={claude.handleSaveProvider}
            />
            <DeleteConfirmDialog
              isOpen={claude.deleteConfirm.isOpen}
              providerName={claude.deleteConfirm.provider?.name ?? ""}
              onConfirm={claude.confirmDeleteProvider}
              onCancel={claude.cancelDeleteProvider}
            />
          </div>
        ) : (
          <div className="vendor-tab-content">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    await handleReloadCodexRuntimeConfig();
                  } finally {
                    await refreshUnifiedExecConfigViews();
                  }
                }}
                disabled={codexReloadStatus === "reloading"}
              >
                {codexReloadStatus === "reloading"
                  ? t("settings.codexRuntimeReloading")
                  : t("settings.codexRuntimeReload")}
              </Button>
              <span
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  lineHeight: 1.4,
                  whiteSpace: "nowrap",
                }}
              >
                {t("settings.codexRuntimeReloadHint")}
              </span>
            </div>
            {codexReloadStatus !== "idle" && (
              <div className="settings-help">
                {codexReloadStatus === "failed"
                  ? codexReloadMessage
                    ? `${t("settings.codexRuntimeReloadFailed")}: ${codexReloadMessage}`
                    : t("settings.codexRuntimeReloadFailed")
                  : codexReloadMessage ?? t("settings.codexRuntimeReloadApplied")}
              </div>
            )}
            {codex.codexProviderError && (
              <div className="settings-help">
                {t("settings.vendor.codexProviderActionFailed")}:{" "}
                {codex.codexProviderError}
              </div>
            )}
            <div className="vendor-codex-runtime-card">
              <div className="vendor-codex-runtime-card-copy">
                <div className="vendor-codex-runtime-card-title-row">
                  <div className="vendor-codex-runtime-card-title">
                    {t("settings.backgroundTerminal")}
                  </div>
                  <span className="vendor-codex-runtime-card-badge">
                    {t("settings.experimentalBadgeOfficial")}
                  </span>
                </div>
                <div className="vendor-codex-runtime-card-description">
                  {t("settings.backgroundTerminalDesc")}
                </div>
                <div className="settings-help">
                  {t("settings.backgroundTerminalMarkerDesc")}
                </div>
                <div className="settings-help">
                  {t("settings.backgroundTerminalOfficialActionsDesc")}
                </div>
                {unifiedExecOfficialDefaultDetail ? (
                  <div className="settings-help">{unifiedExecOfficialDefaultDetail}</div>
                ) : null}
                {unifiedExecOfficialConfigDetail ? (
                  <div className="settings-help">{unifiedExecOfficialConfigDetail}</div>
                ) : null}
                {unifiedExecExternalStatusLoading ? (
                  <div className="settings-help">{t("settings.loading")}</div>
                ) : null}
                {unifiedExecExternalStatusError ? (
                  <div className="settings-help">{unifiedExecExternalStatusError}</div>
                ) : null}
                {unifiedExecActionNotice ? (
                  <div className="settings-help">{unifiedExecActionNotice.message}</div>
                ) : null}
                <div className="vendor-codex-runtime-card-actions">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleSetUnifiedExecOfficialOverride(true)}
                    disabled={unifiedExecActionBusy}
                  >
                    {t("settings.backgroundTerminalOfficialWriteEnabled")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleSetUnifiedExecOfficialOverride(false)}
                    disabled={unifiedExecActionBusy}
                  >
                    {t("settings.backgroundTerminalOfficialWriteDisabled")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleRestoreUnifiedExecOfficialDefault()}
                    disabled={unifiedExecActionBusy}
                  >
                    {t("settings.backgroundTerminalFollowOfficial")}
                  </Button>
                </div>
              </div>
            </div>
            <CurrentCodexGlobalConfigCard
              configLoading={codexGlobalConfigLoading}
              configContent={codexGlobalConfigContent}
              configExists={codexGlobalConfigExists}
              configTruncated={codexGlobalConfigTruncated}
              configError={codexGlobalConfigError}
              authLoading={codexAuthConfigLoading}
              authContent={codexAuthConfigContent}
              authExists={codexAuthConfigExists}
              authTruncated={codexAuthConfigTruncated}
              authError={codexAuthConfigError}
            />
            <div className="vendor-plugin-model-entry vendor-provider-label-toggle">
              <div className="vendor-plugin-model-entry-main">
                <LayoutList size={16} />
                <div>
                  <span className="vendor-plugin-model-entry-title">
                    {t("settings.sidebarProviderLabels")}
                  </span>
                  <div className="settings-help">
                    {t("settings.sidebarProviderLabelsDesc")}
                  </div>
                </div>
              </div>
              <Switch
                checked={appSettings.showSidebarProviderLabels === true}
                aria-label={t("settings.sidebarProviderLabels")}
                onCheckedChange={(checked) =>
                  void onUpdateAppSettings({
                    ...appSettings,
                    showSidebarProviderLabels: checked,
                  })
                }
              />
            </div>
            <CodexProviderList
              providers={codex.codexProviders}
              loading={codex.codexLoading}
              headerActions={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openModelDialog("codex")}
                >
                  <PackagePlus size={14} />
                  {t("settings.vendor.pluginModels")}
                  {codexModels.models.length > 0 ? (
                    <span className="vendor-plugin-model-entry-count">
                      {codexModels.models.length}
                    </span>
                  ) : null}
                </Button>
              }
              onAdd={codex.handleAddCodexProvider}
              onEdit={codex.handleEditCodexProvider}
              onDelete={codex.handleDeleteCodexProvider}
            />
            <CodexProviderDialog
              isOpen={codex.codexProviderDialog.isOpen}
              provider={codex.codexProviderDialog.provider}
              onClose={codex.handleCloseCodexProviderDialog}
              onSave={codex.handleSaveCodexProvider}
            />
            <DeleteConfirmDialog
              isOpen={codex.deleteCodexConfirm.isOpen}
              providerName={codex.deleteCodexConfirm.provider?.name ?? ""}
              onConfirm={codex.confirmDeleteCodexProvider}
              onCancel={codex.cancelDeleteCodexProvider}
            />
          </div>
        )}
      </div>

      <CustomModelDialog
        isOpen={modelDialogOpen}
        models={currentDialogModels}
        onModelsChange={handleDialogModelsChange}
        onClose={closeModelDialog}
        initialAddMode={modelDialogAddMode}
        modelValidation={dialogTarget === "claude" ? "shape-only" : "model-id"}
      />
    </div>
  );
}

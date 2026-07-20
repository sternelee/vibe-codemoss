import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Eye from "lucide-react/dist/esm/icons/eye";
import EyeOff from "lucide-react/dist/esm/icons/eye-off";
import { fetchKimiProviderModels } from "../../../services/tauri";
import type { KimiProviderConfig } from "../types";
import { KIMI_PROVIDER_PRESETS } from "../types";

interface KimiProviderDialogProps {
  isOpen: boolean;
  provider: KimiProviderConfig | null;
  onClose: () => void;
  onSave: (provider: KimiProviderConfig) => void;
}

const KIMI_PROVIDER_TYPES = ["kimi", "openai", "anthropic"] as const;

function detectMatchingPreset(baseUrl: string): string {
  const trimmed = baseUrl.trim();
  if (!trimmed) {
    return "custom";
  }
  const matched = KIMI_PROVIDER_PRESETS.find(
    (preset) => preset.id !== "custom" && preset.baseUrl === trimmed,
  );
  return matched?.id ?? "custom";
}

export function KimiProviderDialog({
  isOpen,
  provider,
  onClose,
  onSave,
}: KimiProviderDialogProps) {
  const { t } = useTranslation();
  const isAdding = !provider;

  const [providerName, setProviderName] = useState("");
  const [activePreset, setActivePreset] = useState("custom");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [model, setModel] = useState("");
  const [providerType, setProviderType] = useState<string>("openai");
  const [maxContextSize, setMaxContextSize] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [remark, setRemark] = useState("");
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [modelFetchError, setModelFetchError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (provider) {
      setProviderName(provider.name || "");
      setBaseUrl(provider.baseUrl || "");
      setApiKey(provider.apiKey || "");
      setModel(provider.model || "");
      setProviderType(provider.providerType || "openai");
      setMaxContextSize(
        provider.maxContextSize ? String(provider.maxContextSize) : "",
      );
      setDisplayName(provider.displayName || "");
      setRemark(provider.remark || "");
      setActivePreset(detectMatchingPreset(provider.baseUrl || ""));
    } else {
      setProviderName("");
      setBaseUrl("");
      setApiKey("");
      setModel("");
      setProviderType("openai");
      setMaxContextSize("");
      setDisplayName("");
      setRemark("");
      setActivePreset("custom");
    }
    setShowApiKey(false);
    setFetchedModels([]);
    setIsFetchingModels(false);
    setModelFetchError("");
  }, [isOpen, provider]);

  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  const handlePresetChange = (presetId: string) => {
    const preset = KIMI_PROVIDER_PRESETS.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }
    setActivePreset(presetId);
    setFetchedModels([]);
    setModelFetchError("");
    setBaseUrl(preset.baseUrl);
    setProviderType(preset.providerType);
    setModel(preset.model);
    setMaxContextSize(
      preset.maxContextSize ? String(preset.maxContextSize) : "",
    );
  };

  const handleFetchModels = async () => {
    const trimmedBaseUrl = baseUrl.trim();
    if (!trimmedBaseUrl) {
      setModelFetchError(t("settings.vendor.dialog.fetchModelsNeedUrl"));
      return;
    }

    setIsFetchingModels(true);
    setModelFetchError("");
    try {
      const result = await fetchKimiProviderModels(trimmedBaseUrl, apiKey);
      setFetchedModels(result.models);
      setModelFetchError(
        result.models.length === 0
          ? t("settings.vendor.dialog.fetchModelsEmpty")
          : "",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : t("settings.vendor.dialog.fetchModelsError");
      setModelFetchError(message || t("settings.vendor.dialog.fetchModelsError"));
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleSave = () => {
    if (!providerName.trim() || !baseUrl.trim() || !model.trim()) return;

    const parsedMaxContextSize = maxContextSize.trim()
      ? Number.parseInt(maxContextSize.trim(), 10)
      : NaN;

    const providerData: KimiProviderConfig = {
      id:
        provider?.id ||
        (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()),
      name: providerName.trim(),
      remark: remark.trim() || undefined,
      websiteUrl: provider?.websiteUrl,
      createdAt: provider?.createdAt,
      sortOrder: provider?.sortOrder,
      isActive: provider?.isActive,
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      model: model.trim(),
      providerType,
      maxContextSize: Number.isFinite(parsedMaxContextSize)
        ? parsedMaxContextSize
        : undefined,
      displayName: displayName.trim() || undefined,
    };

    onSave(providerData);
  };

  if (!isOpen) return null;

  return (
    <div className="vendor-dialog-overlay" onClick={onClose}>
      <div
        className="vendor-dialog vendor-dialog-wide"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="vendor-dialog-header">
          <h3>
            {isAdding
              ? t("settings.vendor.kimiDialog.addTitle")
              : t("settings.vendor.kimiDialog.editTitle")}
          </h3>
          <button type="button" className="vendor-dialog-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="vendor-dialog-body">
          <div className="vendor-form-group">
            <label>{t("settings.vendor.kimiDialog.preset")}</label>
            <select
              className="vendor-input"
              value={activePreset}
              onChange={(e) => handlePresetChange(e.target.value)}
            >
              {KIMI_PROVIDER_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {t(preset.nameKey)}
                </option>
              ))}
            </select>
          </div>

          <div className="vendor-form-grid vendor-form-grid-provider-meta">
            <div className="vendor-form-group">
              <label>{t("settings.vendor.dialog.providerName")} *</label>
              <input
                type="text"
                className="vendor-input"
                placeholder={t("settings.vendor.kimiDialog.namePlaceholder")}
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
              />
            </div>

            <div className="vendor-form-group">
              <label>{t("settings.vendor.dialog.remark")}</label>
              <input
                type="text"
                className="vendor-input"
                placeholder={t("settings.vendor.dialog.remarkPlaceholder")}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
              />
            </div>
          </div>

          <div className="vendor-form-group">
            <label>{t("settings.vendor.kimiDialog.baseUrl")} *</label>
            <input
              type="text"
              className="vendor-input"
              placeholder={t("settings.vendor.kimiDialog.baseUrlPlaceholder")}
              value={baseUrl}
              onChange={(e) => {
                setBaseUrl(e.target.value);
                setActivePreset(detectMatchingPreset(e.target.value));
              }}
            />
          </div>

          <div className="vendor-form-group">
            <label>{t("settings.vendor.dialog.apiKey")}</label>
            <div className="vendor-input-row">
              <input
                type={showApiKey ? "text" : "password"}
                className="vendor-input"
                placeholder={t("settings.vendor.kimiDialog.apiKeyPlaceholder")}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <button
                type="button"
                className="vendor-btn-icon"
                onClick={() => setShowApiKey((current) => !current)}
                title={
                  showApiKey
                    ? t("settings.vendor.hide")
                    : t("settings.vendor.show")
                }
              >
                {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="vendor-form-group">
            <label>{t("settings.vendor.kimiDialog.model")} *</label>
            <div className="vendor-model-fetch">
              <button
                type="button"
                onClick={handleFetchModels}
                disabled={isFetchingModels || !baseUrl.trim()}
              >
                {isFetchingModels
                  ? t("settings.vendor.dialog.fetchModelsLoading")
                  : t("settings.vendor.dialog.fetchModels")}
              </button>
              {modelFetchError ? (
                <span className="vendor-model-fetch-error">{modelFetchError}</span>
              ) : fetchedModels.length > 0 ? (
                <span className="vendor-hint">
                  {t("settings.vendor.dialog.fetchModelsCount", {
                    count: fetchedModels.length,
                  })}
                </span>
              ) : null}
            </div>
            <input
              type="text"
              list="kimi-vendor-fetched-models"
              className="vendor-input"
              placeholder={t("settings.vendor.kimiDialog.modelPlaceholder")}
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
            <datalist id="kimi-vendor-fetched-models">
              {fetchedModels.map((fetchedModel) => (
                <option key={fetchedModel} value={fetchedModel} />
              ))}
            </datalist>
          </div>

          <div className="vendor-form-grid vendor-form-grid-provider-meta">
            <div className="vendor-form-group">
              <label>{t("settings.vendor.kimiDialog.providerType")}</label>
              <select
                className="vendor-input"
                value={providerType}
                onChange={(e) => setProviderType(e.target.value)}
              >
                {KIMI_PROVIDER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`settings.vendor.kimiDialog.providerTypeOptions.${type}`)}
                  </option>
                ))}
              </select>
            </div>

            <div className="vendor-form-group">
              <label>
                {t("settings.vendor.kimiDialog.maxContextSize")}{" "}
                <span className="vendor-optional">
                  ({t("settings.vendor.optional")})
                </span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                className="vendor-input"
                placeholder={t(
                  "settings.vendor.kimiDialog.maxContextSizePlaceholder",
                )}
                value={maxContextSize}
                onChange={(e) => setMaxContextSize(e.target.value)}
              />
            </div>
          </div>

          <div className="vendor-form-group">
            <label>
              {t("settings.vendor.kimiDialog.displayName")}{" "}
              <span className="vendor-optional">
                ({t("settings.vendor.optional")})
              </span>
            </label>
            <input
              type="text"
              className="vendor-input"
              placeholder={t("settings.vendor.kimiDialog.displayNamePlaceholder")}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
        </div>

        <div className="vendor-dialog-footer">
          <button type="button" className="vendor-btn-cancel" onClick={onClose}>
            {t("settings.vendor.cancel")}
          </button>
          <button
            type="button"
            className="vendor-btn-save"
            onClick={handleSave}
            disabled={
              !providerName.trim() || !baseUrl.trim() || !model.trim()
            }
          >
            {isAdding
              ? t("settings.vendor.dialog.confirmAdd")
              : t("settings.vendor.dialog.saveChanges")}
          </button>
        </div>
      </div>
    </div>
  );
}

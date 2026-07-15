import { useTranslation } from "react-i18next";
import Languages from "lucide-react/dist/esm/icons/languages";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SUPPORTED_LANGUAGES,
  saveLanguage,
  type SupportedLanguage,
} from "../../../i18n";

const supportedCodes = new Set<SupportedLanguage>(
  SUPPORTED_LANGUAGES.map((entry) => entry.code),
);

/**
 * Maps the active i18next language (which may carry a region suffix like
 * "en-US") onto one of our supported codes, defaulting to Simplified Chinese.
 */
export function resolveCurrentLanguage(
  language: string | undefined,
): SupportedLanguage {
  const raw = language ?? "";
  if (supportedCodes.has(raw as SupportedLanguage)) {
    return raw as SupportedLanguage;
  }
  const primary = raw.split("-")[0]?.toLowerCase();
  const match = SUPPORTED_LANGUAGES.find(
    (entry) => entry.code.split("-")[0]?.toLowerCase() === primary,
  );
  return match?.code ?? "zh";
}

export function LanguageSelector() {
  const { t, i18n } = useTranslation();
  const currentLanguage = resolveCurrentLanguage(i18n.language);

  const handleLanguageChange = (newLang: string) => {
    if (newLang === currentLanguage) {
      return;
    }
    void i18n.changeLanguage(newLang);
    saveLanguage(newLang);
  };

  return (
    <div className="settings-field settings-basic-item">
      <div className="settings-basic-field-header">
        <Languages className="settings-basic-field-icon" aria-hidden />
        <span className="settings-basic-field-label">{t("settings.language")}</span>
      </div>
      <div className="settings-control settings-basic-language-control">
        <Select value={currentLanguage} onValueChange={handleLanguageChange}>
          <SelectTrigger
            className="settings-basic-language-select-trigger"
            aria-label={t("settings.language")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="settings-basic-language-select-popup">
            {SUPPORTED_LANGUAGES.map((entry) => (
              <SelectItem key={entry.code} value={entry.code}>
                {entry.nativeName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

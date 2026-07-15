import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getClientStoreSync, writeClientStoreValue } from "../services/clientStorage";

export type SupportedLanguage =
  | "zh"
  | "zh-TW"
  | "en"
  | "hi"
  | "es"
  | "fr"
  | "ja"
  | "ru"
  | "ko"
  | "pt-BR";

/**
 * Single source of truth for the language picker. `nativeName` is the language's
 * own endonym, so it renders correctly regardless of the active UI language and
 * needs no translation key. Order mirrors the product's chosen display order.
 */
export const SUPPORTED_LANGUAGES: ReadonlyArray<{
  code: SupportedLanguage;
  nativeName: string;
}> = [
  { code: "zh", nativeName: "简体中文" },
  { code: "zh-TW", nativeName: "繁體中文" },
  { code: "en", nativeName: "English" },
  { code: "hi", nativeName: "हिन्दी" },
  { code: "es", nativeName: "Español" },
  { code: "fr", nativeName: "Français" },
  { code: "ja", nativeName: "日本語" },
  { code: "ru", nativeName: "Русский" },
  { code: "ko", nativeName: "한국어" },
  { code: "pt-BR", nativeName: "Português (Brasil)" },
];

const supportedLanguages = new Set<SupportedLanguage>(
  SUPPORTED_LANGUAGES.map((entry) => entry.code),
);

const DEFAULT_LANGUAGE: SupportedLanguage = "zh";

/**
 * Loaders only exist for languages that ship a full translation bundle today.
 * Languages without a loader render through their fallback chain (see below),
 * so adding a bundle later is just a matter of registering another loader here.
 */
const localeLoaders: Partial<
  Record<SupportedLanguage, () => Promise<{ default: Record<string, unknown> }>>
> = {
  en: () => import("./locales/en"),
  zh: () => import("./locales/zh"),
};

/**
 * Per-language fallback chains. Traditional Chinese degrades to Simplified before
 * English; every other bundle-less language degrades straight to English. Kept in
 * sync with the `fallbackLng` object passed to i18next at init time.
 */
const fallbackChains: Partial<Record<SupportedLanguage, SupportedLanguage[]>> = {
  "zh-TW": ["zh", "en"],
};
const DEFAULT_FALLBACK: SupportedLanguage[] = ["en"];

function fallbackChainFor(lang: SupportedLanguage): SupportedLanguage[] {
  return fallbackChains[lang] ?? DEFAULT_FALLBACK;
}

const i18nextFallback = SUPPORTED_LANGUAGES.reduce<Record<string, string[]>>(
  (acc, { code }) => {
    if (fallbackChains[code]) {
      acc[code] = fallbackChains[code] as string[];
    }
    return acc;
  },
  { default: DEFAULT_FALLBACK },
);

const loadedLanguages = new Set<SupportedLanguage>();
const loadedResources: Partial<Record<SupportedLanguage, Record<string, unknown>>> = {};

function normalizeLanguage(lang: string | undefined): SupportedLanguage {
  return supportedLanguages.has(lang as SupportedLanguage)
    ? (lang as SupportedLanguage)
    : DEFAULT_LANGUAGE;
}

const getStoredLanguage = (): SupportedLanguage => {
  const stored = getClientStoreSync<string>("app", "language");
  return normalizeLanguage(stored);
};

export const saveLanguage = (lang: string): void => {
  writeClientStoreValue("app", "language", normalizeLanguage(lang));
};

if (initReactI18next && typeof initReactI18next === "object") {
  i18n.use(initReactI18next);
}

const i18nInstance = i18n;

/** Load a single bundle if it exists and hasn't been loaded yet (idempotent). */
async function loadBundle(lang: SupportedLanguage): Promise<void> {
  if (loadedLanguages.has(lang)) {
    return;
  }
  const loader = localeLoaders[lang];
  if (!loader) {
    return; // no bundle for this language yet — handled by fallback chain
  }
  const resource = await loader();
  loadedResources[lang] = resource.default;
  if (i18nInstance.isInitialized && typeof i18nInstance.addResourceBundle === "function") {
    i18nInstance.addResourceBundle(lang, "translation", resource.default, true, true);
  }
  loadedLanguages.add(lang);
}

async function loadLanguageResource(lang: string | undefined): Promise<SupportedLanguage> {
  const normalized = normalizeLanguage(lang);
  await loadBundle(normalized);
  // Languages without their own bundle need the fallback chain loaded so that
  // i18next can resolve keys instead of showing raw key strings.
  if (!localeLoaders[normalized]) {
    for (const fallback of fallbackChainFor(normalized)) {
      await loadBundle(fallback);
    }
  }
  return normalized;
}

const originalChangeLanguage = i18nInstance.changeLanguage.bind(i18nInstance);

i18nInstance.changeLanguage = (async (
  lang?: string,
  callback?: Parameters<typeof i18nInstance.changeLanguage>[1],
) => {
  const normalized = await loadLanguageResource(lang ?? getStoredLanguage());
  return originalChangeLanguage(normalized, callback);
}) as typeof i18nInstance.changeLanguage;

export const i18nReady = (async () => {
  const initialLanguage = await loadLanguageResource(getStoredLanguage());
  const resources = Object.entries(loadedResources).reduce<
    Record<string, { translation: Record<string, unknown> }>
  >((acc, [lng, resource]) => {
    acc[lng] = { translation: resource ?? {} };
    return acc;
  }, {});
  await i18nInstance.init({
    resources,
    lng: initialLanguage,
    fallbackLng: i18nextFallback,
    interpolation: {
      escapeValue: false,
    },
  });
  return i18nInstance;
})();

export default i18n;

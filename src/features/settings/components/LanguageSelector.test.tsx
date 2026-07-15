// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { LanguageSelector, resolveCurrentLanguage } from "./LanguageSelector";

let currentLanguage = "zh";
const useTranslationMock = vi.fn(() => ({
  t: (key: string) => (key === "settings.language" ? "Language" : key),
  i18n: {
    language: currentLanguage,
    changeLanguage: vi.fn(),
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => useTranslationMock(),
}));

vi.mock("../../../i18n", () => ({
  SUPPORTED_LANGUAGES: [
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
  ],
  saveLanguage: vi.fn(),
}));

describe("resolveCurrentLanguage", () => {
  it("keeps an exact supported code", () => {
    expect(resolveCurrentLanguage("zh-TW")).toBe("zh-TW");
    expect(resolveCurrentLanguage("ja")).toBe("ja");
  });

  it("maps a region-suffixed code onto its supported base", () => {
    expect(resolveCurrentLanguage("en-US")).toBe("en");
    expect(resolveCurrentLanguage("zh-CN")).toBe("zh");
  });

  it("falls back to Simplified Chinese for unknown or empty input", () => {
    expect(resolveCurrentLanguage("de")).toBe("zh");
    expect(resolveCurrentLanguage(undefined)).toBe("zh");
  });
});

describe("LanguageSelector", () => {
  afterEach(() => {
    cleanup();
    currentLanguage = "zh";
  });

  it("shows the active language's native name in the trigger", () => {
    currentLanguage = "zh";
    render(<LanguageSelector />);
    expect(screen.getByLabelText("Language").textContent).toContain("简体中文");
  });

  it("reflects a non-default active language", () => {
    currentLanguage = "en";
    render(<LanguageSelector />);
    expect(screen.getByLabelText("Language").textContent).toContain("English");
  });
});

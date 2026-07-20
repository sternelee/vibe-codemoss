// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { fetchKimiProviderModels } from "../../../services/tauri";
import { KimiProviderDialog } from "./KimiProviderDialog";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) =>
      key === "settings.vendor.dialog.fetchModelsCount"
        ? `${options?.count ?? 0} models loaded`
        : key,
  }),
}));

vi.mock("../../../services/tauri", () => ({
  fetchKimiProviderModels: vi.fn(),
}));

describe("KimiProviderDialog model fetching", () => {
  it("fetches models and attaches datalist suggestions to the model input", async () => {
    vi.mocked(fetchKimiProviderModels).mockResolvedValueOnce({
      models: ["kimi-for-coding", "kimi-k2.5"],
      endpoint: "https://api.kimi.com/coding/v1/models",
    });

    render(
      <KimiProviderDialog
        isOpen
        provider={null}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    fireEvent.change(
      screen.getByPlaceholderText(
        "settings.vendor.kimiDialog.baseUrlPlaceholder",
      ),
      { target: { value: "https://api.kimi.com/coding/v1" } },
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        "settings.vendor.kimiDialog.apiKeyPlaceholder",
      ),
      { target: { value: "sk-test" } },
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "settings.vendor.dialog.fetchModels",
      }),
    );

    await waitFor(() => {
      expect(fetchKimiProviderModels).toHaveBeenCalledWith(
        "https://api.kimi.com/coding/v1",
        "sk-test",
      );
    });

    expect(await screen.findByText("2 models loaded")).toBeTruthy();
    const options = Array.from(
      document.querySelectorAll<HTMLOptionElement>(
        "#kimi-vendor-fetched-models option",
      ),
    ).map((option) => option.value);
    expect(options).toEqual(["kimi-for-coding", "kimi-k2.5"]);
    expect(
      screen
        .getByPlaceholderText("settings.vendor.kimiDialog.modelPlaceholder")
        .getAttribute("list"),
    ).toBe("kimi-vendor-fetched-models");
  });

  it("assembles a KimiProviderConfig with the kimi-coding preset applied", () => {
    const onSave = vi.fn();
    render(
      <KimiProviderDialog
        isOpen
        provider={null}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.change(
      screen.getByDisplayValue("settings.vendor.kimiPresets.custom"),
      { target: { value: "kimi-coding" } },
    );
    fireEvent.change(
      screen.getByPlaceholderText("settings.vendor.kimiDialog.namePlaceholder"),
      { target: { value: "My Kimi" } },
    );

    fireEvent.click(
      screen.getByRole("button", { name: "settings.vendor.dialog.confirmAdd" }),
    );

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "My Kimi",
        baseUrl: "https://api.kimi.com/coding/v1",
        model: "kimi-for-coding",
        providerType: "kimi",
        maxContextSize: 262144,
      }),
    );
  });
});

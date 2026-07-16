// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCodexUnifiedExecExternalStatus,
  readGlobalCodexAuthJson,
  readGlobalCodexConfigToml,
  restoreCodexUnifiedExecOfficialDefault,
  setCodexUnifiedExecOfficialOverride,
} from "../../../services/tauri";
import { pushErrorToast } from "../../../services/toasts";
import type { AppSettings } from "../../../types";
import { VendorSettingsPanel } from "./VendorSettingsPanel";

const mockState = vi.hoisted(() => ({
  claudeManagement: {
    currentConfig: null,
    currentConfigLoading: false,
    providers: [],
    loading: false,
    handleSwitchProvider: vi.fn(),
    handleAddProvider: vi.fn(),
    handleEditProvider: vi.fn(),
    handleDeleteProvider: vi.fn(),
    providerDialog: { isOpen: false, provider: null },
    handleCloseProviderDialog: vi.fn(),
    handleSaveProvider: vi.fn(),
    deleteConfirm: { isOpen: false, provider: null },
    confirmDeleteProvider: vi.fn(),
    cancelDeleteProvider: vi.fn(),
  },
  codexManagement: {
    codexProviderError: null,
    codexProviders: [],
    codexLoading: false,
    handleAddCodexProvider: vi.fn(),
    handleEditCodexProvider: vi.fn(),
    handleDeleteCodexProvider: vi.fn(),
    handleSwitchCodexProvider: vi.fn(),
    codexProviderDialog: { isOpen: false, provider: null },
    handleCloseCodexProviderDialog: vi.fn(),
    handleSaveCodexProvider: vi.fn(),
    deleteCodexConfirm: { isOpen: false, provider: null },
    confirmDeleteCodexProvider: vi.fn(),
    cancelDeleteCodexProvider: vi.fn(),
  },
  claudeModels: { models: [], updateModels: vi.fn() },
  codexModels: { models: [], updateModels: vi.fn() },
}));

vi.mock("../hooks/useProviderManagement", () => ({
  useProviderManagement: vi.fn(() => mockState.claudeManagement),
}));

vi.mock("../hooks/useCodexProviderManagement", () => ({
  useCodexProviderManagement: vi.fn(() => mockState.codexManagement),
}));

vi.mock("../hooks/usePluginModels", () => ({
  usePluginModels: vi.fn((key: string) => {
    if (key === "codex-custom-models") {
      return mockState.codexModels;
    }
    return mockState.claudeModels;
  }),
}));

vi.mock("../modelManagerRequest", () => ({
  consumeVendorModelManagerRequest: vi.fn(() => null),
  VENDOR_MODEL_MANAGER_REQUEST_EVENT: "vendor-model-manager-request",
}));

vi.mock("./ProviderList", () => ({
  ProviderList: () => <div data-testid="provider-list-stub" />,
}));

vi.mock("./CodexProviderList", () => ({
  CodexProviderList: () => <div data-testid="codex-provider-list-stub" />,
}));

vi.mock("./ProviderDialog", () => ({
  ProviderDialog: () => null,
}));

vi.mock("./CodexProviderDialog", () => ({
  CodexProviderDialog: () => null,
}));

vi.mock("./DeleteConfirmDialog", () => ({
  DeleteConfirmDialog: () => null,
}));

vi.mock("./CustomModelDialog", () => ({
  CustomModelDialog: () => null,
}));

vi.mock("./CurrentCodexGlobalConfigCard", () => ({
  CurrentCodexGlobalConfigCard: () => (
    <div data-testid="current-codex-config-stub" />
  ),
}));

vi.mock("../../../services/tauri", async () => {
  const actual = await vi.importActual<
    typeof import("../../../services/tauri")
  >("../../../services/tauri");
  return {
    ...actual,
    readGlobalCodexConfigToml: vi.fn(),
    readGlobalCodexAuthJson: vi.fn(),
    getCodexUnifiedExecExternalStatus: vi.fn(),
    restoreCodexUnifiedExecOfficialDefault: vi.fn(),
    setCodexUnifiedExecOfficialOverride: vi.fn(),
  };
});

vi.mock("../../../services/toasts", () => ({
  pushErrorToast: vi.fn(),
}));

const readGlobalCodexConfigTomlMock = vi.mocked(readGlobalCodexConfigToml);
const readGlobalCodexAuthJsonMock = vi.mocked(readGlobalCodexAuthJson);
const getCodexUnifiedExecExternalStatusMock = vi.mocked(
  getCodexUnifiedExecExternalStatus,
);
const restoreCodexUnifiedExecOfficialDefaultMock = vi.mocked(
  restoreCodexUnifiedExecOfficialDefault,
);
const setCodexUnifiedExecOfficialOverrideMock = vi.mocked(
  setCodexUnifiedExecOfficialOverride,
);
const pushErrorToastMock = vi.mocked(pushErrorToast);

function renderPanel(
  options: {
    appSettings?: Partial<AppSettings>;
    handleReloadCodexRuntimeConfig?: () => Promise<void>;
    codexReloadStatus?: "idle" | "reloading" | "applied" | "failed";
    codexReloadMessage?: string | null;
    onUpdateAppSettings?: (next: AppSettings) => Promise<void>;
  } = {},
) {
  const handleReloadCodexRuntimeConfig =
    options.handleReloadCodexRuntimeConfig ??
    vi.fn().mockResolvedValue(undefined);
  const appSettings = {
    showSidebarProviderLabels: false,
    ...options.appSettings,
  } as AppSettings;
  const onUpdateAppSettings =
    options.onUpdateAppSettings ?? vi.fn().mockResolvedValue(undefined);

  render(
    <VendorSettingsPanel
      appSettings={appSettings}
      codexReloadStatus={options.codexReloadStatus ?? "idle"}
      codexReloadMessage={options.codexReloadMessage ?? null}
      handleReloadCodexRuntimeConfig={handleReloadCodexRuntimeConfig}
      onUpdateAppSettings={onUpdateAppSettings}
    />,
  );

  return {
    handleReloadCodexRuntimeConfig,
    onUpdateAppSettings,
  };
}

async function openCodexTab() {
  fireEvent.click(screen.getByRole("button", { name: "Codex CLI" }));
  await waitFor(() => {
    expect(getCodexUnifiedExecExternalStatusMock).toHaveBeenCalled();
  });
  return (await screen.findByText("Background terminal")).closest(
    ".vendor-codex-runtime-card",
  ) as HTMLElement;
}

beforeEach(() => {
  readGlobalCodexConfigTomlMock.mockResolvedValue({
    exists: true,
    content: "[features]\n",
    truncated: false,
  });
  readGlobalCodexAuthJsonMock.mockResolvedValue({
    exists: true,
    content: '{"access_token":"***"}',
    truncated: false,
  });
  getCodexUnifiedExecExternalStatusMock.mockResolvedValue({
    configPath: "/tmp/codex/config.toml",
    hasExplicitUnifiedExec: false,
    explicitUnifiedExecValue: null,
    officialDefaultEnabled: true,
  });
  restoreCodexUnifiedExecOfficialDefaultMock.mockResolvedValue({
    configPath: "/tmp/codex/config.toml",
    hasExplicitUnifiedExec: false,
    explicitUnifiedExecValue: null,
    officialDefaultEnabled: true,
  });
  setCodexUnifiedExecOfficialOverrideMock.mockResolvedValue({
    configPath: "/tmp/codex/config.toml",
    hasExplicitUnifiedExec: true,
    explicitUnifiedExecValue: true,
    officialDefaultEnabled: true,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("VendorSettingsPanel", () => {
  it("renders supported CLI names and planned CLI placeholders", async () => {
    renderPanel();

    await waitFor(() => {
      expect(readGlobalCodexConfigTomlMock).toHaveBeenCalled();
      expect(readGlobalCodexAuthJsonMock).toHaveBeenCalled();
    });
    expect(screen.getByRole("button", { name: /Claude Code CLI/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Codex CLI/ })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /OpenCode CLI/ }).getAttribute("aria-disabled"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: /Gemini CLI/ }).getAttribute("aria-disabled"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: /Kiro CLI/ }).getAttribute("aria-disabled"),
    ).toBe("true");

    const navLabels = screen
      .getAllByRole("button")
      .map(
        (button) =>
          button.querySelector(".min-w-0")?.textContent?.trim() ?? "",
      )
      .filter((label) => label.endsWith("CLI"));
    expect(navLabels.slice(0, 8)).toEqual([
      "Claude Code CLI",
      "Codex CLI",
      "Gemini CLI",
      "OpenCode CLI",
      "GLM CLI",
      "Trae CLI",
      "Cursor CLI",
      "Kimi CLI",
    ]);
    expect(navLabels).toEqual(
      expect.arrayContaining(["DevEco CLI", "PI CLI", "iFlow CLI"]),
    );
    expect(screen.queryByRole("button", { name: /Droid CLI/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Goose CLI/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Hermes CLI/ })).toBeNull();
  });

  it("keeps planned CLI placeholders on the current tab and shows a coming soon toast", async () => {
    renderPanel();

    await waitFor(() => {
      expect(readGlobalCodexConfigTomlMock).toHaveBeenCalled();
      expect(readGlobalCodexAuthJsonMock).toHaveBeenCalled();
    });
    fireEvent.click(screen.getByRole("button", { name: /CodeBuddy CLI/ }));

    expect(pushErrorToastMock).toHaveBeenCalledWith({
      title: "CodeBuddy CLI",
      message: "settings.vendor.cliComingSoon",
      variant: "info",
    });
    expect(screen.queryByTestId("current-claude-config-stub")).toBeNull();
    expect(screen.queryByTestId("current-codex-config-stub")).toBeNull();
  });

  it("keeps the CLI engine list in its own scroll container", async () => {
    renderPanel();

    await waitFor(() => {
      expect(readGlobalCodexConfigTomlMock).toHaveBeenCalled();
      expect(readGlobalCodexAuthJsonMock).toHaveBeenCalled();
    });

    expect(screen.getByLabelText("settings.vendorsTitle").className).toContain(
      "vendor-engine-nav-scroll",
    );
  });

  it("shows background terminal official actions in the Codex tab", async () => {
    renderPanel();

    const runtimeCard = await openCodexTab();
    const runtimeCardQueries = within(runtimeCard);

    expect(runtimeCardQueries.getByText("Background terminal")).toBeTruthy();
    expect(runtimeCardQueries.getByText("Official config")).toBeTruthy();
    expect(runtimeCardQueries.getByText("Enable")).toBeTruthy();
    expect(runtimeCardQueries.getByText("Disable")).toBeTruthy();
    expect(runtimeCardQueries.getByText("Follow official default")).toBeTruthy();
    expect(
      runtimeCardQueries.getByText("Official default on this platform: enabled."),
    ).toBeTruthy();
  });

  it("toggles sidebar provider labels from the Codex provider tab", async () => {
    const { onUpdateAppSettings } = renderPanel();

    await openCodexTab();

    fireEvent.click(
      screen.getByRole("switch", {
        name: "Show provider labels in session lists",
      }),
    );

    await waitFor(() => {
      expect(onUpdateAppSettings).toHaveBeenCalledWith(
        expect.objectContaining({ showSidebarProviderLabels: true }),
      );
    });
  });

  it("restores official default without extra confirm dialog", async () => {
    getCodexUnifiedExecExternalStatusMock.mockResolvedValue({
      configPath: "/tmp/codex/config.toml",
      hasExplicitUnifiedExec: true,
      explicitUnifiedExecValue: false,
      officialDefaultEnabled: true,
    });
    restoreCodexUnifiedExecOfficialDefaultMock.mockResolvedValue({
      configPath: "/tmp/codex/config.toml",
      hasExplicitUnifiedExec: false,
      explicitUnifiedExecValue: null,
      officialDefaultEnabled: true,
    });

    renderPanel();
    await openCodexTab();

    fireEvent.click(
      screen.getByRole("button", { name: "Follow official default" }),
    );

    await waitFor(() => {
      expect(restoreCodexUnifiedExecOfficialDefaultMock).toHaveBeenCalledTimes(
        1,
      );
    });
    expect(
      await screen.findByText("Restored the official unified_exec config."),
    ).toBeTruthy();
  });

  it("writes official unified_exec and reloads inherit sessions", async () => {
    const handleReloadCodexRuntimeConfig = vi.fn().mockResolvedValue(undefined);
    setCodexUnifiedExecOfficialOverrideMock.mockResolvedValue({
      configPath: "/tmp/codex/config.toml",
      hasExplicitUnifiedExec: true,
      explicitUnifiedExecValue: true,
      officialDefaultEnabled: true,
    });

    renderPanel({ handleReloadCodexRuntimeConfig });
    await openCodexTab();

    fireEvent.click(screen.getByRole("button", { name: "Enable" }));

    await waitFor(() => {
      expect(setCodexUnifiedExecOfficialOverrideMock).toHaveBeenCalledWith(
        true,
      );
      expect(handleReloadCodexRuntimeConfig).toHaveBeenCalledTimes(1);
    });
    expect(
      await screen.findByText("Wrote official unified_exec = enabled."),
    ).toBeTruthy();
  });

  it("shows the no-session reload message without an applied prefix", async () => {
    renderPanel({
      codexReloadStatus: "applied",
      codexReloadMessage:
        "No Codex session is currently connected. The config has been updated and will apply on the next connection.",
    });

    await openCodexTab();

    expect(
      screen.getByText(
        "No Codex session is currently connected. The config has been updated and will apply on the next connection.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/Codex runtime config applied:/)).toBeNull();
  });

  it("refreshes Codex config content and unified_exec status after reload", async () => {
    const { handleReloadCodexRuntimeConfig } = renderPanel();

    await openCodexTab();

    const initialConfigReads = readGlobalCodexConfigTomlMock.mock.calls.length;
    const initialAuthReads = readGlobalCodexAuthJsonMock.mock.calls.length;
    const initialStatusReads =
      getCodexUnifiedExecExternalStatusMock.mock.calls.length;

    fireEvent.click(
      screen.getByRole("button", { name: "settings.codexRuntimeReload" }),
    );

    await waitFor(() => {
      expect(handleReloadCodexRuntimeConfig).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(readGlobalCodexConfigTomlMock.mock.calls.length).toBeGreaterThan(
        initialConfigReads,
      );
      expect(readGlobalCodexAuthJsonMock.mock.calls.length).toBeGreaterThan(
        initialAuthReads,
      );
      expect(
        getCodexUnifiedExecExternalStatusMock.mock.calls.length,
      ).toBeGreaterThan(initialStatusReads);
    });
  });
});

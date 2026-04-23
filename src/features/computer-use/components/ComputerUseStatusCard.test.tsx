// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ComputerUseStatusCard } from "./ComputerUseStatusCard";

const useComputerUseBridgeStatusMock = vi.fn();
const useComputerUseActivationMock = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("../hooks/useComputerUseBridgeStatus", () => ({
  useComputerUseBridgeStatus: (...args: unknown[]) =>
    useComputerUseBridgeStatusMock(...args),
}));

vi.mock("../hooks/useComputerUseActivation", () => ({
  useComputerUseActivation: (...args: unknown[]) =>
    useComputerUseActivationMock(...args),
}));

function blockedMacStatus() {
  return {
    featureEnabled: true,
    activationEnabled: true,
    status: "blocked" as const,
    platform: "macos",
    codexAppDetected: true,
    pluginDetected: true,
    pluginEnabled: true,
    blockedReasons: [
      "helper_bridge_unverified",
      "permission_required",
      "approval_required",
    ],
    guidanceCodes: [
      "verify_helper_bridge",
      "grant_system_permissions",
      "review_allowed_apps",
    ],
    codexConfigPath: "/Users/demo/.codex/config.toml",
    pluginManifestPath:
      "/Users/demo/.codex/plugins/cache/openai-bundled/computer-use/1/.codex-plugin/plugin.json",
    helperPath:
      "/Applications/Codex.app/Contents/Resources/plugins/openai-bundled/plugins/computer-use/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient",
    helperDescriptorPath:
      "/Applications/Codex.app/Contents/Resources/plugins/openai-bundled/plugins/computer-use/.mcp.json",
    marketplacePath:
      "/Applications/Codex.app/Contents/Resources/plugins/openai-bundled/.agents/plugins/marketplace.json",
    diagnosticMessage: "bridge verification pending",
  };
}

describe("ComputerUseStatusCard", () => {
  beforeEach(() => {
    useComputerUseBridgeStatusMock.mockReset();
    useComputerUseActivationMock.mockReset();
  });

  it("renders blocked reasons and activation action for eligible macos state", () => {
    const activateMock = vi.fn();

    useComputerUseBridgeStatusMock.mockReturnValue({
      status: blockedMacStatus(),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });
    useComputerUseActivationMock.mockReturnValue({
      result: null,
      isRunning: false,
      error: null,
      activate: activateMock,
      reset: vi.fn(),
    });

    render(<ComputerUseStatusCard />);

    expect(screen.getByText("settings.computerUse.title")).toBeTruthy();
    expect(screen.getByText("settings.computerUse.status.blocked")).toBeTruthy();
    expect(
      screen.getByText("settings.computerUse.reason.helper_bridge_unverified"),
    ).toBeTruthy();
    expect(
      screen.getByText("settings.computerUse.reason.permission_required"),
    ).toBeTruthy();
    expect(
      screen.getByText("settings.computerUse.guidance.verify_helper_bridge"),
    ).toBeTruthy();
    expect(screen.getByText("bridge verification pending")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", {
        name: "settings.computerUse.activation.verify",
      }),
    );
    expect(activateMock).toHaveBeenCalledTimes(1);
  });

  it("renders error state when bridge loading fails", () => {
    useComputerUseBridgeStatusMock.mockReturnValue({
      status: null,
      isLoading: false,
      error: "ipc unavailable",
      refresh: vi.fn(),
    });
    useComputerUseActivationMock.mockReturnValue({
      result: null,
      isRunning: false,
      error: null,
      activate: vi.fn(),
      reset: vi.fn(),
    });

    render(<ComputerUseStatusCard />);

    expect(
      screen.getByText("settings.computerUse.loadFailed: ipc unavailable"),
    ).toBeTruthy();
  });

  it("falls back to status-only surface when activation is disabled", () => {
    useComputerUseBridgeStatusMock.mockReturnValue({
      status: {
        ...blockedMacStatus(),
        activationEnabled: false,
      },
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });
    useComputerUseActivationMock.mockReturnValue({
      result: null,
      isRunning: false,
      error: null,
      activate: vi.fn(),
      reset: vi.fn(),
    });

    render(<ComputerUseStatusCard />);

    expect(
      screen.queryByRole("button", {
        name: "settings.computerUse.activation.verify",
      }),
    ).toBeNull();
    expect(
      screen.getByText("settings.computerUse.phaseOneNotice"),
    ).toBeTruthy();
    expect(useComputerUseActivationMock).toHaveBeenCalledWith({
      enabled: false,
    });
  });

  it("renders activation probe result and hides stale helper bridge blocker", () => {
    useComputerUseBridgeStatusMock.mockReturnValue({
      status: blockedMacStatus(),
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });
    useComputerUseActivationMock.mockReturnValue({
      result: {
        outcome: "blocked",
        failureKind: "remaining_blockers",
        bridgeStatus: {
          ...blockedMacStatus(),
          blockedReasons: ["permission_required", "approval_required"],
          guidanceCodes: ["grant_system_permissions", "review_allowed_apps"],
          diagnosticMessage: null,
        },
        durationMs: 412,
        diagnosticMessage: "helper bridge verified",
        stderrSnippet: null,
        exitCode: 0,
      },
      isRunning: false,
      error: null,
      activate: vi.fn(),
      reset: vi.fn(),
    });

    render(<ComputerUseStatusCard />);

    expect(
      screen.getByText("settings.computerUse.activation.resultTitle"),
    ).toBeTruthy();
    expect(
      screen.getByText("settings.computerUse.activation.outcome.blocked"),
    ).toBeTruthy();
    expect(
      screen.getByText("settings.computerUse.activation.failure.remaining_blockers"),
    ).toBeTruthy();
    expect(screen.getByText("helper bridge verified")).toBeTruthy();
    expect(
      screen.queryByText("settings.computerUse.reason.helper_bridge_unverified"),
    ).toBeNull();
    expect(
      screen.queryByRole("button", {
        name: "settings.computerUse.activation.verify",
      }),
    ).toBeNull();
  });

  it("clears stale activation result before manual status refresh", () => {
    const refreshMock = vi.fn();
    const resetMock = vi.fn();
    useComputerUseBridgeStatusMock.mockReturnValue({
      status: blockedMacStatus(),
      isLoading: false,
      error: null,
      refresh: refreshMock,
    });
    useComputerUseActivationMock.mockReturnValue({
      result: {
        outcome: "failed",
        failureKind: "host_incompatible",
        bridgeStatus: blockedMacStatus(),
        durationMs: 0,
        diagnosticMessage: "stale probe result",
        stderrSnippet: null,
        exitCode: null,
      },
      isRunning: false,
      error: null,
      activate: vi.fn(),
      reset: resetMock,
    });

    render(<ComputerUseStatusCard />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "settings.computerUse.refresh",
      }),
    );

    expect(resetMock).toHaveBeenCalledTimes(1);
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("does not render activation action for unsupported windows hosts", () => {
    useComputerUseBridgeStatusMock.mockReturnValue({
      status: {
        featureEnabled: true,
        activationEnabled: true,
        status: "unsupported",
        platform: "windows",
        codexAppDetected: false,
        pluginDetected: false,
        pluginEnabled: false,
        blockedReasons: ["platform_unsupported"],
        guidanceCodes: ["unsupported_platform"],
        codexConfigPath: null,
        pluginManifestPath: null,
        helperPath: null,
        helperDescriptorPath: null,
        marketplacePath: null,
        diagnosticMessage: null,
      },
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });
    useComputerUseActivationMock.mockReturnValue({
      result: null,
      isRunning: false,
      error: null,
      activate: vi.fn(),
      reset: vi.fn(),
    });

    render(<ComputerUseStatusCard />);

    expect(
      screen.getByText("settings.computerUse.status.unsupported"),
    ).toBeTruthy();
    expect(
      screen.getByText("settings.computerUse.reason.platform_unsupported"),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", {
        name: "settings.computerUse.activation.verify",
      }),
    ).toBeNull();
  });
});

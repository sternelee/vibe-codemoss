// @vitest-environment jsdom
import type { ErrorInfo, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  appendRendererDiagnosticMock,
  recoverFromReactScanUpdateDepthErrorMock,
} = vi.hoisted(() => ({
  appendRendererDiagnosticMock: vi.fn(),
  recoverFromReactScanUpdateDepthErrorMock: vi.fn(),
}));

vi.mock("../services/rendererDiagnostics", () => ({
  appendRendererDiagnostic: appendRendererDiagnosticMock,
}));

vi.mock("../services/reactScanController", () => ({
  recoverFromReactScanUpdateDepthError: recoverFromReactScanUpdateDepthErrorMock,
}));

import { ErrorBoundary } from "./ErrorBoundary";

function createBoundary() {
  return new ErrorBoundary({ children: null as ReactNode });
}

const errorInfo = {
  componentStack: "\n    at Messages",
} as ErrorInfo;

describe("ErrorBoundary react-scan recovery", () => {
  beforeEach(() => {
    appendRendererDiagnosticMock.mockClear();
    recoverFromReactScanUpdateDepthErrorMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("records the bounded recovery and skips the ordinary error detail update", () => {
    recoverFromReactScanUpdateDepthErrorMock.mockReturnValue("recovered");
    const boundary = createBoundary();
    boundary.setState = vi.fn();
    const error = new Error("Minified React error #185");

    boundary.componentDidCatch(error, errorInfo);

    expect(recoverFromReactScanUpdateDepthErrorMock).toHaveBeenCalledWith(error);
    expect(boundary.setState).not.toHaveBeenCalled();
    expect(appendRendererDiagnosticMock).toHaveBeenCalledWith(
      "react/error-boundary-react-scan-recovery",
      expect.objectContaining({ errorClass: "maximum-update-depth" }),
    );
  });

  it("keeps the ordinary ErrorBoundary path when react-scan recovery does not apply", () => {
    recoverFromReactScanUpdateDepthErrorMock.mockReturnValue("not-applicable");
    const consoleErrorMock = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const boundary = createBoundary();
    boundary.setState = vi.fn();
    const error = new Error("render failed");

    boundary.componentDidCatch(error, errorInfo);

    expect(boundary.setState).toHaveBeenCalledWith({ errorInfo });
    expect(appendRendererDiagnosticMock).toHaveBeenCalledWith(
      "react/error-boundary",
      expect.objectContaining({ error: "Error: render failed" }),
    );
    expect(consoleErrorMock).toHaveBeenCalledOnce();
  });

  it("records a content-safe recovery failure before keeping the ordinary error path", () => {
    recoverFromReactScanUpdateDepthErrorMock.mockReturnValue("failed");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const boundary = createBoundary();
    boundary.setState = vi.fn();
    const error = new Error("Maximum update depth exceeded");

    boundary.componentDidCatch(error, errorInfo);

    expect(appendRendererDiagnosticMock).toHaveBeenNthCalledWith(
      1,
      "react/error-boundary-react-scan-recovery-failed",
      expect.objectContaining({ errorClass: "maximum-update-depth" }),
    );
    expect(appendRendererDiagnosticMock).toHaveBeenNthCalledWith(
      2,
      "react/error-boundary",
      expect.objectContaining({
        error: "Error: Maximum update depth exceeded",
      }),
    );
    expect(boundary.setState).toHaveBeenCalledWith({ errorInfo });
  });
});

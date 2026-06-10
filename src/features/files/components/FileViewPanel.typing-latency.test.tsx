/** @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockCodeMirrorDispatch } from "./FileViewPanel.test-utils";
import { FileViewPanel } from "./FileViewPanel";
import {
  readWorkspaceFile,
  writeExternalSpecFile,
  writeWorkspaceFile,
} from "../../../services/tauri";
import {
  writeClientStoreData,
  writeClientStoreValue,
} from "../../../services/clientStorage";

vi.mock("../../../services/clientStorage", () => ({
  getClientStoreSync: vi.fn(),
  writeClientStoreData: vi.fn(),
  writeClientStoreValue: vi.fn(),
}));

describe("FileViewPanel typing latency contract", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockCodeMirrorDispatch.mockReset();
  });

  it("keeps typing local-first without per-keystroke Tauri or clientStorage writes", async () => {
    vi.mocked(readWorkspaceFile).mockResolvedValue({
      content: "const value = 1;",
      truncated: false,
    });

    render(
      <FileViewPanel
        workspaceId="ws-typing-latency"
        workspacePath="/repo"
        filePath="src/value.ts"
        openTargets={[]}
        openAppIconById={{}}
        selectedOpenAppId=""
        onSelectOpenAppId={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const editor = (await screen.findByTestId("mock-codemirror")) as HTMLTextAreaElement;
    vi.mocked(writeWorkspaceFile).mockClear();
    vi.mocked(writeExternalSpecFile).mockClear();
    vi.mocked(writeClientStoreData).mockClear();
    vi.mocked(writeClientStoreValue).mockClear();

    fireEvent.change(editor, { target: { value: "const value = 2;" } });
    fireEvent.change(editor, { target: { value: "const value = 3;" } });
    fireEvent.change(editor, { target: { value: "const value = 4;" } });

    expect(editor.value).toBe("const value = 4;");
    expect(writeWorkspaceFile).not.toHaveBeenCalled();
    expect(writeExternalSpecFile).not.toHaveBeenCalled();
    expect(writeClientStoreData).not.toHaveBeenCalled();
    expect(writeClientStoreValue).not.toHaveBeenCalled();

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 160));
    });

    expect(writeWorkspaceFile).not.toHaveBeenCalled();
    expect(writeExternalSpecFile).not.toHaveBeenCalled();
    expect(writeClientStoreData).not.toHaveBeenCalled();
    expect(writeClientStoreValue).not.toHaveBeenCalled();
  });

  it("keeps large edit-mode typing local-first in proxy smoke coverage", async () => {
    const largeContent = Array.from(
      { length: 5_000 },
      (_, index) => `line ${index + 1}`,
    ).join("\n");
    vi.mocked(readWorkspaceFile).mockResolvedValue({
      content: largeContent,
      truncated: false,
    });

    render(
      <FileViewPanel
        workspaceId="ws-typing-large"
        workspacePath="/repo"
        filePath="src/large.ts"
        openTargets={[]}
        openAppIconById={{}}
        selectedOpenAppId=""
        onSelectOpenAppId={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const editor = (await screen.findByTestId("mock-codemirror")) as HTMLTextAreaElement;
    vi.mocked(writeWorkspaceFile).mockClear();
    vi.mocked(writeExternalSpecFile).mockClear();
    vi.mocked(writeClientStoreData).mockClear();
    vi.mocked(writeClientStoreValue).mockClear();

    const nextContent = `${largeContent}\nlocal edit`;
    fireEvent.change(editor, { target: { value: nextContent } });

    expect(editor.value).toBe(nextContent);
    expect(writeWorkspaceFile).not.toHaveBeenCalled();
    expect(writeExternalSpecFile).not.toHaveBeenCalled();
    expect(writeClientStoreData).not.toHaveBeenCalled();
    expect(writeClientStoreValue).not.toHaveBeenCalled();
  });
});

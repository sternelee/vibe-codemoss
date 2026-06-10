import { describe, expect, it } from "vitest";
import { createFileEditorTypingDiagnosticsSession } from "./fileEditorTypingDiagnostics";

describe("fileEditorTypingDiagnostics", () => {
  it("emits bounded content-safe proxy evidence", () => {
    const session = createFileEditorTypingDiagnosticsSession({
      workspaceId: "ws-1",
      filePath: "src/secret-value.ts",
      fileKind: "text",
      byteLength: 2048,
      lineCount: 42,
    });

    session.recordInput(2);
    session.recordInput(5);
    session.recordPublishedUpdate();
    session.recordTauriFileWrite();
    session.recordSelfSaveSuppression();

    const evidence = session.snapshot();

    expect(evidence).toMatchObject({
      source: "file-editor-typing",
      evidenceClass: "proxy",
      workspaceId: "ws-1",
      fileKind: "text",
      byteLengthBucket: "<=16384",
      lineCountBucket: "<=200",
      inputEventCount: 2,
      publishedUpdateCount: 1,
      tauriFileWriteCount: 1,
      clientStorageWriteCount: 0,
      selfSaveSuppressionCount: 1,
      editorTransactionDurationP95Ms: 5,
      visibleEchoLatencyP95Ms: null,
      longTaskCount: null,
    });
    expect(evidence.filePathHash).toMatch(/^fnv1a32:/);
    expect(JSON.stringify(evidence)).not.toContain("secret-value");
  });
});

export type FileEditorTypingEvidenceClass =
  | "measured"
  | "proxy"
  | "manual-only"
  | "unsupported";

export type FileEditorTypingDiagnosticsMetadata = {
  workspaceId: string;
  filePath: string;
  fileKind: string;
  byteLength?: number | null;
  lineCount?: number | null;
  evidenceClass?: FileEditorTypingEvidenceClass;
};

export type FileEditorTypingEvidence = {
  source: "file-editor-typing";
  evidenceClass: FileEditorTypingEvidenceClass;
  workspaceId: string;
  filePathHash: string;
  fileKind: string;
  byteLengthBucket: string;
  lineCountBucket: string;
  inputEventCount: number;
  publishedUpdateCount: number;
  tauriFileWriteCount: number;
  clientStorageWriteCount: number;
  selfSaveSuppressionCount: number;
  staleSyncDropCount: number;
  editorTransactionDurationP95Ms: number | null;
  visibleEchoLatencyP95Ms: number | null;
  longTaskCount: number | null;
  generatedAt: string;
};

export type FileEditorTypingDiagnosticsSession = {
  recordInput: (durationMs?: number | null) => void;
  recordPublishedUpdate: () => void;
  recordTauriFileWrite: () => void;
  recordClientStorageWrite: () => void;
  recordSelfSaveSuppression: () => void;
  recordStaleSyncDrop: () => void;
  snapshot: () => FileEditorTypingEvidence;
};

function hashFilePath(filePath: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < filePath.length; index += 1) {
    hash ^= filePath.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function bucketCount(value: number | null | undefined, buckets: number[]) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "unknown";
  }
  for (const bucket of buckets) {
    if (value <= bucket) {
      return `<=${bucket}`;
    }
  }
  return `>${buckets[buckets.length - 1]}`;
}

function percentile95(values: number[]) {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return Number(sorted[index].toFixed(2));
}

export function createFileEditorTypingDiagnosticsSession(
  metadata: FileEditorTypingDiagnosticsMetadata,
): FileEditorTypingDiagnosticsSession {
  let inputEventCount = 0;
  let publishedUpdateCount = 0;
  let tauriFileWriteCount = 0;
  let clientStorageWriteCount = 0;
  let selfSaveSuppressionCount = 0;
  let staleSyncDropCount = 0;
  const editorTransactionDurations: number[] = [];

  return {
    recordInput(durationMs) {
      inputEventCount += 1;
      if (
        typeof durationMs === "number" &&
        Number.isFinite(durationMs) &&
        durationMs >= 0
      ) {
        editorTransactionDurations.push(durationMs);
      }
    },
    recordPublishedUpdate() {
      publishedUpdateCount += 1;
    },
    recordTauriFileWrite() {
      tauriFileWriteCount += 1;
    },
    recordClientStorageWrite() {
      clientStorageWriteCount += 1;
    },
    recordSelfSaveSuppression() {
      selfSaveSuppressionCount += 1;
    },
    recordStaleSyncDrop() {
      staleSyncDropCount += 1;
    },
    snapshot() {
      return {
        source: "file-editor-typing",
        evidenceClass: metadata.evidenceClass ?? "proxy",
        workspaceId: metadata.workspaceId,
        filePathHash: hashFilePath(metadata.filePath),
        fileKind: metadata.fileKind,
        byteLengthBucket: bucketCount(metadata.byteLength, [
          16_384,
          65_536,
          262_144,
          1_048_576,
        ]),
        lineCountBucket: bucketCount(metadata.lineCount, [200, 1_000, 5_000, 20_000]),
        inputEventCount,
        publishedUpdateCount,
        tauriFileWriteCount,
        clientStorageWriteCount,
        selfSaveSuppressionCount,
        staleSyncDropCount,
        editorTransactionDurationP95Ms: percentile95(editorTransactionDurations),
        visibleEchoLatencyP95Ms: null,
        longTaskCount: null,
        generatedAt: new Date().toISOString(),
      };
    },
  };
}

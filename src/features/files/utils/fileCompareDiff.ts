import { diffArrays } from "diff";

export type FileCompareLineChange = {
  rowIndex: number;
  lineNumbersByColumn: Array<number | null>;
};

export type FileCompareLineGap = {
  lineNumber: number;
  count: number;
};

export type FileCompareCollapsedRange = {
  fromLine: number;
  toLine: number;
};

type FileCompareAlignedCell = {
  lineNumber: number;
  value: string;
} | null;

export type FileCompareDiffResult = {
  rowCount: number;
  changedRows: FileCompareLineChange[];
  changedBlocks: FileCompareLineChange[];
  changedLineNumbersByColumn: number[][];
  gapLineCountsByColumn: FileCompareLineGap[][];
};

function splitCompareLines(text: string): string[] {
  if (text.length === 0) {
    return [];
  }
  return text.split(/\r\n|\n|\r/);
}

export function buildFocusedFileCompareRanges(
  text: string,
  changedLineNumbers: number[],
  contextLines = 3,
): FileCompareCollapsedRange[] {
  const lineCount = splitCompareLines(text).length;
  if (lineCount === 0 || changedLineNumbers.length === 0) {
    return lineCount > 0 ? [{ fromLine: 1, toLine: lineCount }] : [];
  }

  const context = Math.max(0, Math.floor(contextLines));
  const visibleLines = new Set<number>();
  for (const changedLineNumber of changedLineNumbers) {
    const fromLine = Math.max(1, changedLineNumber - context);
    const toLine = Math.min(lineCount, changedLineNumber + context);
    for (let lineNumber = fromLine; lineNumber <= toLine; lineNumber += 1) {
      visibleLines.add(lineNumber);
    }
  }

  const collapsedRanges: FileCompareCollapsedRange[] = [];
  let rangeStart: number | null = null;
  for (let lineNumber = 1; lineNumber <= lineCount; lineNumber += 1) {
    if (!visibleLines.has(lineNumber)) {
      rangeStart ??= lineNumber;
      continue;
    }
    if (rangeStart !== null) {
      collapsedRanges.push({ fromLine: rangeStart, toLine: lineNumber - 1 });
      rangeStart = null;
    }
  }
  if (rangeStart !== null) {
    collapsedRanges.push({ fromLine: rangeStart, toLine: lineCount });
  }
  return collapsedRanges;
}

function isChangedRow(rowValues: string[]) {
  const first = rowValues[0] ?? "";
  return rowValues.some((value) => value !== first);
}

function commonPrefixLength(left: string, right: string) {
  const maxLength = Math.min(left.length, right.length);
  let index = 0;
  while (index < maxLength && left[index] === right[index]) {
    index += 1;
  }
  return index;
}

function getAssignmentKey(line: string) {
  const separatorIndex = line.indexOf("=");
  return separatorIndex > 0 ? line.slice(0, separatorIndex).trim() : "";
}

function areLikelyReplacementLines(left: string, right: string) {
  const trimmedLeft = left.trim();
  const trimmedRight = right.trim();
  if (!trimmedLeft || !trimmedRight) {
    return false;
  }
  const leftAssignmentKey = getAssignmentKey(trimmedLeft);
  const rightAssignmentKey = getAssignmentKey(trimmedRight);
  if (leftAssignmentKey && leftAssignmentKey === rightAssignmentKey) {
    return true;
  }
  return (
    commonPrefixLength(trimmedLeft, trimmedRight) >=
    Math.min(4, trimmedLeft.length, trimmedRight.length)
  );
}

function getSubstitutionCost(left: string, right: string) {
  if (left === right) {
    return 0;
  }
  return areLikelyReplacementLines(left, right) ? 1 : 2;
}

type AlignOperation =
  | { kind: "pair"; baseIndex: number; targetIndex: number }
  | { kind: "base-only"; baseIndex: number }
  | { kind: "target-only"; targetIndex: number; beforeBaseIndex: number };

const ALIGNMENT_CELL_LIMIT = 800_000;
const LARGE_ALIGNMENT_MAX_EDIT_LENGTH = 2_048;

function appendUnanchoredEditGroup(
  operations: AlignOperation[],
  baseLines: string[],
  targetLines: string[],
  baseStart: number,
  baseEnd: number,
  targetStart: number,
  targetEnd: number,
) {
  const pairedCount = Math.min(baseEnd - baseStart, targetEnd - targetStart);
  for (let offset = 0; offset < pairedCount; offset += 1) {
    const baseIndex = baseStart + offset;
    const targetIndex = targetStart + offset;
    if (areLikelyReplacementLines(baseLines[baseIndex] ?? "", targetLines[targetIndex] ?? "")) {
      operations.push({ kind: "pair", baseIndex, targetIndex });
    } else {
      operations.push({ kind: "target-only", targetIndex, beforeBaseIndex: baseIndex });
      operations.push({ kind: "base-only", baseIndex });
    }
  }
  for (let targetIndex = targetStart + pairedCount; targetIndex < targetEnd; targetIndex += 1) {
    operations.push({ kind: "target-only", targetIndex, beforeBaseIndex: baseEnd });
  }
  for (let baseIndex = baseStart + pairedCount; baseIndex < baseEnd; baseIndex += 1) {
    operations.push({ kind: "base-only", baseIndex });
  }
}

function findUniqueLineAnchors(baseLines: string[], targetLines: string[]) {
  const collectUniqueIndices = (lines: string[]) => {
    const indices = new Map<string, number>();
    const duplicates = new Set<string>();
    lines.forEach((line, index) => {
      if (indices.has(line)) {
        duplicates.add(line);
      } else {
        indices.set(line, index);
      }
    });
    duplicates.forEach((line) => indices.delete(line));
    return indices;
  };
  const baseIndices = collectUniqueIndices(baseLines);
  const targetIndices = collectUniqueIndices(targetLines);
  const candidates = Array.from(baseIndices, ([line, baseIndex]) => ({
    baseIndex,
    targetIndex: targetIndices.get(line),
  })).filter(
    (anchor): anchor is { baseIndex: number; targetIndex: number } =>
      anchor.targetIndex !== undefined,
  );
  candidates.sort((left, right) => left.baseIndex - right.baseIndex);

  const tails: number[] = [];
  const tailCandidateIndices: number[] = [];
  const previousCandidateIndices = new Int32Array(candidates.length).fill(-1);
  candidates.forEach((candidate, candidateIndex) => {
    let low = 0;
    let high = tails.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if ((tails[middle] ?? -1) < candidate.targetIndex) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    if (low > 0) {
      previousCandidateIndices[candidateIndex] = tailCandidateIndices[low - 1] ?? -1;
    }
    tails[low] = candidate.targetIndex;
    tailCandidateIndices[low] = candidateIndex;
  });

  const anchors: Array<{ baseIndex: number; targetIndex: number }> = [];
  let candidateIndex = tailCandidateIndices.at(-1) ?? -1;
  while (candidateIndex >= 0) {
    anchors.push(candidates[candidateIndex]!);
    candidateIndex = previousCandidateIndices[candidateIndex] ?? -1;
  }
  return anchors.reverse();
}

function alignLargeTargetToBaseByAnchors(
  baseLines: string[],
  targetLines: string[],
): AlignOperation[] {
  const operations: AlignOperation[] = [];
  const anchors = findUniqueLineAnchors(baseLines, targetLines);
  let baseStart = 0;
  let targetStart = 0;
  for (const anchor of anchors) {
    appendUnanchoredEditGroup(
      operations,
      baseLines,
      targetLines,
      baseStart,
      anchor.baseIndex,
      targetStart,
      anchor.targetIndex,
    );
    operations.push({
      kind: "pair",
      baseIndex: anchor.baseIndex,
      targetIndex: anchor.targetIndex,
    });
    baseStart = anchor.baseIndex + 1;
    targetStart = anchor.targetIndex + 1;
  }
  appendUnanchoredEditGroup(
    operations,
    baseLines,
    targetLines,
    baseStart,
    baseLines.length,
    targetStart,
    targetLines.length,
  );
  return operations;
}

function alignLargeTargetToBase(
  baseLines: string[],
  targetLines: string[],
): AlignOperation[] | null {
  const changes = diffArrays(baseLines, targetLines, {
    maxEditLength: LARGE_ALIGNMENT_MAX_EDIT_LENGTH,
  });
  if (!changes) {
    return alignLargeTargetToBaseByAnchors(baseLines, targetLines);
  }

  const operations: AlignOperation[] = [];
  let baseIndex = 0;
  let targetIndex = 0;
  let removedIndices: number[] = [];
  let addedIndices: number[] = [];

  const flushEditGroup = () => {
    const pairedCount = Math.min(removedIndices.length, addedIndices.length);
    for (let index = 0; index < pairedCount; index += 1) {
      const removedIndex = removedIndices[index]!;
      const addedIndex = addedIndices[index]!;
      if (
        areLikelyReplacementLines(
          baseLines[removedIndex] ?? "",
          targetLines[addedIndex] ?? "",
        )
      ) {
        operations.push({
          kind: "pair",
          baseIndex: removedIndex,
          targetIndex: addedIndex,
        });
      } else {
        operations.push({
          kind: "target-only",
          targetIndex: addedIndex,
          beforeBaseIndex: removedIndex,
        });
        operations.push({ kind: "base-only", baseIndex: removedIndex });
      }
    }
    for (let index = pairedCount; index < addedIndices.length; index += 1) {
      operations.push({
        kind: "target-only",
        targetIndex: addedIndices[index]!,
        beforeBaseIndex: removedIndices[pairedCount] ?? baseIndex,
      });
    }
    for (let index = pairedCount; index < removedIndices.length; index += 1) {
      operations.push({ kind: "base-only", baseIndex: removedIndices[index]! });
    }
    removedIndices = [];
    addedIndices = [];
  };

  for (const change of changes) {
    if (change.removed) {
      removedIndices.push(
        ...Array.from(
          { length: change.value.length },
          (_unused, offset) => baseIndex + offset,
        ),
      );
      baseIndex += change.value.length;
      continue;
    }
    if (change.added) {
      addedIndices.push(
        ...Array.from(
          { length: change.value.length },
          (_unused, offset) => targetIndex + offset,
        ),
      );
      targetIndex += change.value.length;
      continue;
    }

    flushEditGroup();
    for (let offset = 0; offset < change.value.length; offset += 1) {
      operations.push({
        kind: "pair",
        baseIndex: baseIndex + offset,
        targetIndex: targetIndex + offset,
      });
    }
    baseIndex += change.value.length;
    targetIndex += change.value.length;
  }
  flushEditGroup();

  return operations;
}

function alignTargetToBase(
  baseLines: string[],
  targetLines: string[],
): AlignOperation[] | null {
  if (baseLines.length * targetLines.length > ALIGNMENT_CELL_LIMIT) {
    return alignLargeTargetToBase(baseLines, targetLines);
  }
  const width = targetLines.length + 1;
  const costs = new Uint32Array((baseLines.length + 1) * width);
  const at = (baseIndex: number, targetIndex: number) =>
    baseIndex * width + targetIndex;

  for (let baseIndex = 0; baseIndex <= baseLines.length; baseIndex += 1) {
    costs[at(baseIndex, 0)] = baseIndex;
  }
  for (
    let targetIndex = 0;
    targetIndex <= targetLines.length;
    targetIndex += 1
  ) {
    costs[at(0, targetIndex)] = targetIndex;
  }

  for (let baseIndex = 1; baseIndex <= baseLines.length; baseIndex += 1) {
    for (
      let targetIndex = 1;
      targetIndex <= targetLines.length;
      targetIndex += 1
    ) {
      const substitutionCost = getSubstitutionCost(
        baseLines[baseIndex - 1] ?? "",
        targetLines[targetIndex - 1] ?? "",
      );
      const replaceCost =
        costs[at(baseIndex - 1, targetIndex - 1)] + substitutionCost;
      const deleteCost = costs[at(baseIndex - 1, targetIndex)] + 1;
      const insertCost = costs[at(baseIndex, targetIndex - 1)] + 1;
      costs[at(baseIndex, targetIndex)] = Math.min(
        replaceCost,
        deleteCost,
        insertCost,
      );
    }
  }

  const operations: AlignOperation[] = [];
  let baseIndex = baseLines.length;
  let targetIndex = targetLines.length;
  while (baseIndex > 0 || targetIndex > 0) {
    if (baseIndex > 0 && targetIndex > 0) {
      const substitutionCost = getSubstitutionCost(
        baseLines[baseIndex - 1] ?? "",
        targetLines[targetIndex - 1] ?? "",
      );
      if (
        substitutionCost < 2 &&
        costs[at(baseIndex, targetIndex)] ===
          costs[at(baseIndex - 1, targetIndex - 1)] + substitutionCost
      ) {
        operations.push({
          kind: "pair",
          baseIndex: baseIndex - 1,
          targetIndex: targetIndex - 1,
        });
        baseIndex -= 1;
        targetIndex -= 1;
        continue;
      }
    }
    if (
      baseIndex > 0 &&
      costs[at(baseIndex, targetIndex)] ===
        costs[at(baseIndex - 1, targetIndex)] + 1
    ) {
      operations.push({ kind: "base-only", baseIndex: baseIndex - 1 });
      baseIndex -= 1;
      continue;
    }
    if (targetIndex > 0) {
      operations.push({
        kind: "target-only",
        targetIndex: targetIndex - 1,
        beforeBaseIndex: baseIndex,
      });
      targetIndex -= 1;
      continue;
    }
    if (baseIndex > 0 && targetIndex > 0) {
      operations.push({
        kind: "pair",
        baseIndex: baseIndex - 1,
        targetIndex: targetIndex - 1,
      });
      baseIndex -= 1;
      targetIndex -= 1;
      continue;
    }
  }

  return operations.reverse();
}

function computeIndexAlignedRows(
  lineSets: string[][],
): FileCompareAlignedCell[][] {
  const rowCount = lineSets.reduce(
    (maxRows, lines) => Math.max(maxRows, lines.length),
    0,
  );
  return Array.from({ length: rowCount }, (_unused, rowIndex) =>
    lineSets.map((lines) =>
      rowIndex < lines.length
        ? { lineNumber: rowIndex + 1, value: lines[rowIndex] ?? "" }
        : null,
    ),
  );
}

function computeAnchorAlignedRows(
  lineSets: string[][],
): FileCompareAlignedCell[][] | null {
  if (lineSets.length === 0) {
    return [];
  }
  const baseLines = lineSets[0] ?? [];
  const targetAlignments = lineSets
    .slice(1)
    .map((targetLines) => alignTargetToBase(baseLines, targetLines));
  if (targetAlignments.some((alignment) => alignment === null)) {
    return null;
  }
  const rows: FileCompareAlignedCell[][] = [];
  const insertionRowsByBaseIndex = new Map<
    number,
    FileCompareAlignedCell[][]
  >();
  const rowByBaseIndex = new Map<number, FileCompareAlignedCell[]>();

  const ensureInsertionRow = (
    beforeBaseIndex: number,
    insertionIndex: number,
  ) => {
    const existingRows = insertionRowsByBaseIndex.get(beforeBaseIndex) ?? [];
    while (existingRows.length <= insertionIndex) {
      existingRows.push(lineSets.map(() => null) as FileCompareAlignedCell[]);
    }
    insertionRowsByBaseIndex.set(beforeBaseIndex, existingRows);
    return existingRows[insertionIndex]!;
  };

  for (let baseIndex = 0; baseIndex < baseLines.length; baseIndex += 1) {
    const row = lineSets.map(() => null) as FileCompareAlignedCell[];
    row[0] = { lineNumber: baseIndex + 1, value: baseLines[baseIndex] ?? "" };
    rowByBaseIndex.set(baseIndex, row);
  }

  targetAlignments.forEach((alignment, targetOffset) => {
    const columnIndex = targetOffset + 1;
    const insertionCursorByBaseIndex = new Map<number, number>();
    for (const operation of alignment ?? []) {
      if (operation.kind === "pair") {
        const row = rowByBaseIndex.get(operation.baseIndex);
        if (row) {
          row[columnIndex] = {
            lineNumber: operation.targetIndex + 1,
            value: lineSets[columnIndex]?.[operation.targetIndex] ?? "",
          };
        }
        continue;
      }
      if (operation.kind === "base-only") {
        continue;
      }
      const nextInsertionIndex =
        insertionCursorByBaseIndex.get(operation.beforeBaseIndex) ?? 0;
      const row = ensureInsertionRow(
        operation.beforeBaseIndex,
        nextInsertionIndex,
      );
      row[columnIndex] = {
        lineNumber: operation.targetIndex + 1,
        value: lineSets[columnIndex]?.[operation.targetIndex] ?? "",
      };
      insertionCursorByBaseIndex.set(
        operation.beforeBaseIndex,
        nextInsertionIndex + 1,
      );
    }
  });

  for (let baseIndex = 0; baseIndex <= baseLines.length; baseIndex += 1) {
    const insertionRows = insertionRowsByBaseIndex.get(baseIndex) ?? [];
    rows.push(...insertionRows);
    const baseRow = rowByBaseIndex.get(baseIndex);
    if (baseRow) {
      rows.push(baseRow);
    }
  }

  return rows;
}

function buildGapLineCountsByColumn(
  rows: FileCompareAlignedCell[][],
  lineSets: string[][],
): FileCompareLineGap[][] {
  return lineSets.map((lines, columnIndex) => {
    const gaps: FileCompareLineGap[] = [];
    let pendingGapCount = 0;
    for (const row of rows) {
      const cell = row[columnIndex];
      if (!cell) {
        pendingGapCount += 1;
        continue;
      }
      if (pendingGapCount > 0) {
        gaps.push({ lineNumber: cell.lineNumber, count: pendingGapCount });
        pendingGapCount = 0;
      }
    }
    if (pendingGapCount > 0) {
      gaps.push({ lineNumber: lines.length + 1, count: pendingGapCount });
    }
    return gaps;
  });
}

export function computeFileCompareDiff(texts: string[]): FileCompareDiffResult {
  const lineSets = texts.map(splitCompareLines);
  const alignedRows =
    computeAnchorAlignedRows(lineSets) ?? computeIndexAlignedRows(lineSets);
  const changedRows: FileCompareLineChange[] = [];
  const changedBlocks: FileCompareLineChange[] = [];
  const changedLineNumberSets = texts.map(() => new Set<number>());
  const gapLineCountsByColumn = buildGapLineCountsByColumn(
    alignedRows,
    lineSets,
  );

  for (let rowIndex = 0; rowIndex < alignedRows.length; rowIndex += 1) {
    const row = alignedRows[rowIndex] ?? [];
    const rowValues = row.map((cell) => cell?.value ?? "");
    const lineNumbersByColumn = row.map((cell) => cell?.lineNumber ?? null);
    const hasGap = row.some((cell) => cell === null);
    if (!hasGap && !isChangedRow(rowValues)) {
      continue;
    }
    const changedRow = {
      rowIndex,
      lineNumbersByColumn,
    };
    const previousChangedRow = changedRows.at(-1);
    changedRows.push(changedRow);
    if (!previousChangedRow || previousChangedRow.rowIndex + 1 !== rowIndex) {
      changedBlocks.push(changedRow);
    }
    lineNumbersByColumn.forEach((lineNumber, columnIndex) => {
      if (lineNumber !== null) {
        changedLineNumberSets[columnIndex]?.add(lineNumber);
      }
    });
  }

  return {
    rowCount: alignedRows.length,
    changedRows,
    changedBlocks,
    changedLineNumbersByColumn: changedLineNumberSets.map((lineNumbers) =>
      Array.from(lineNumbers).sort((left, right) => left - right),
    ),
    gapLineCountsByColumn,
  };
}

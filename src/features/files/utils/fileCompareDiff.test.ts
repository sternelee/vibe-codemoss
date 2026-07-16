import { describe, expect, it } from "vitest";
import {
  buildFocusedFileCompareRanges,
  computeFileCompareDiff,
} from "./fileCompareDiff";

describe("buildFocusedFileCompareRanges", () => {
  it("collapses unchanged prefix, middle and suffix while retaining context", () => {
    const text = Array.from({ length: 30 }, (_unused, index) => `line ${index + 1}`).join("\n");

    expect(buildFocusedFileCompareRanges(text, [10, 20], 2)).toEqual([
      { fromLine: 1, toLine: 7 },
      { fromLine: 13, toLine: 17 },
      { fromLine: 23, toLine: 30 },
    ]);
  });

  it("collapses a non-empty side with no changed lines and keeps an empty side empty", () => {
    expect(buildFocusedFileCompareRanges("unchanged", [])).toEqual([
      { fromLine: 1, toLine: 1 },
    ]);
    expect(buildFocusedFileCompareRanges("", [])).toEqual([]);
  });
});

describe("computeFileCompareDiff", () => {
  it("marks changed line numbers across two files", () => {
    const result = computeFileCompareDiff(["a\nb\nc", "a\nb1\nc"]);

    expect(result.rowCount).toBe(3);
    expect(result.changedRows).toEqual([
      {
        rowIndex: 1,
        lineNumbersByColumn: [2, 2],
      },
    ]);
    expect(result.changedBlocks).toEqual(result.changedRows);
    expect(result.changedLineNumbersByColumn).toEqual([[2], [2]]);
    expect(result.gapLineCountsByColumn).toEqual([[], []]);
  });

  it("adds visual gaps for inserted and deleted rows", () => {
    const result = computeFileCompareDiff(["a\nb\nc", "a\nx\nc"]);

    expect(result.rowCount).toBe(4);
    expect(result.changedRows).toEqual([
      {
        rowIndex: 1,
        lineNumbersByColumn: [null, 2],
      },
      {
        rowIndex: 2,
        lineNumbersByColumn: [2, null],
      },
    ]);
    expect(result.changedBlocks).toEqual([result.changedRows[0]]);
    expect(result.changedLineNumbersByColumn).toEqual([[2], [2]]);
    expect(result.gapLineCountsByColumn).toEqual([
      [{ lineNumber: 2, count: 1 }],
      [{ lineNumber: 3, count: 1 }],
    ]);
  });

  it("supports missing rows in n-way compare", () => {
    const result = computeFileCompareDiff(["a\nb", "a", "a\nb\nc"]);

    expect(result.rowCount).toBe(3);
    expect(result.changedRows).toEqual([
      {
        rowIndex: 1,
        lineNumbersByColumn: [2, null, 2],
      },
      {
        rowIndex: 2,
        lineNumbersByColumn: [null, null, 3],
      },
    ]);
    expect(result.changedBlocks).toEqual([result.changedRows[0]]);
    expect(result.changedLineNumbersByColumn).toEqual([[2], [], [2, 3]]);
    expect(result.gapLineCountsByColumn).toEqual([
      [{ lineNumber: 3, count: 1 }],
      [{ lineNumber: 2, count: 2 }],
      [],
    ]);
  });

  it("keeps the unchanged suffix aligned after an early insertion in a large file", () => {
    const baseLines = Array.from(
      { length: 4_000 },
      (_unused, index) => `stable line ${String(index + 1).padStart(4, "0")}`,
    );
    const insertedLines = Array.from(
      { length: 14 },
      (_unused, index) => `inserted changelog line ${index + 1}`,
    );
    const targetLines = [
      ...baseLines.slice(0, 13),
      ...insertedLines,
      ...baseLines.slice(13),
    ];

    const result = computeFileCompareDiff([
      baseLines.join("\n"),
      targetLines.join("\n"),
    ]);

    expect(result.changedRows).toHaveLength(14);
    expect(result.changedBlocks).toEqual([result.changedRows[0]]);
    expect(result.changedRows[0]?.lineNumbersByColumn).toEqual([null, 14]);
    expect(result.changedRows.at(-1)?.lineNumbersByColumn).toEqual([null, 27]);
    expect(result.changedLineNumbersByColumn).toEqual([
      [],
      Array.from({ length: 14 }, (_unused, index) => index + 14),
    ]);
    expect(result.gapLineCountsByColumn).toEqual([
      [{ lineNumber: 14, count: 14 }],
      [],
    ]);
  });

  it("realigns unchanged regions between distant large-file edit groups", () => {
    const baseLines = Array.from(
      { length: 4_000 },
      (_unused, index) =>
        `unique source line ${String(index + 1).padStart(4, "0")}`,
    );
    const targetLines = [
      ...baseLines.slice(0, 100),
      "first inserted line",
      "second inserted line",
      ...baseLines.slice(100, 3_000),
      ...baseLines.slice(3_002),
    ];

    const result = computeFileCompareDiff([
      baseLines.join("\n"),
      targetLines.join("\n"),
    ]);

    expect(result.changedRows).toHaveLength(4);
    expect(result.changedBlocks).toEqual([
      result.changedRows[0],
      result.changedRows[2],
    ]);
    expect(result.changedLineNumbersByColumn).toEqual([
      [3_001, 3_002],
      [101, 102],
    ]);
    expect(result.changedRows.at(-1)?.lineNumbersByColumn).toEqual([
      3_002,
      null,
    ]);
  });

  it("realigns a large unchanged suffix after edit distance exceeds the jsdiff limit", () => {
    const baseLines = Array.from(
      { length: 4_000 },
      (_unused, index) => `stable anchor line ${String(index + 1).padStart(4, "0")}`,
    );
    const insertedLines = Array.from(
      { length: 2_200 },
      (_unused, index) => `large inserted line ${index + 1}`,
    );
    const targetLines = [
      ...baseLines.slice(0, 100),
      ...insertedLines,
      ...baseLines.slice(100),
    ];

    const result = computeFileCompareDiff([
      baseLines.join("\n"),
      targetLines.join("\n"),
    ]);

    expect(result.changedRows).toHaveLength(insertedLines.length);
    expect(result.changedBlocks).toEqual([result.changedRows[0]]);
    expect(result.changedRows[0]?.lineNumbersByColumn).toEqual([null, 101]);
    expect(result.changedRows.at(-1)?.lineNumbersByColumn).toEqual([null, 2_300]);
    expect(result.gapLineCountsByColumn).toEqual([
      [{ lineNumber: 101, count: insertedLines.length }],
      [],
    ]);
  });

  it("keeps the reported AuthServiceImpl verifyPassword anchors on one aligned row", () => {
    const sharedPrefix = Array.from({ length: 100 }, (_unused, index) =>
      index % 20 === 0 ? "    @Override" : `    // shared Java line ${index + 1}`,
    );
    const legacyLines = Array.from(
      { length: 19 },
      (_unused, index) => `    // removed authentication line ${index + 1}`,
    );
    const sharedMethodTail = [
      "    LogEvents.tokenRefreshSucceeded(log, username);",
      "",
      "    return response;",
      "}",
    ];
    const verifyPasswordMethod = [
      "    @Override",
      "    public boolean verifyPassword(String rawPassword, String encodedPassword) {",
      "        return passwordEncoder.matches(rawPassword, encodedPassword);",
      "    }",
    ];
    const extractedMethods = Array.from(
      { length: 29 },
      (_unused, index) => `    // extracted helper line ${index + 1}`,
    );
    const previousLines = [
      ...sharedPrefix,
      ...legacyLines,
      ...sharedMethodTail,
      ...verifyPasswordMethod,
      "}",
    ];
    const currentLines = [
      ...sharedPrefix,
      ...sharedMethodTail,
      ...verifyPasswordMethod,
      ...extractedMethods,
      "}",
    ];

    const result = computeFileCompareDiff([
      previousLines.join("\n"),
      currentLines.join("\n"),
    ]);
    const alignedRowForLine = (columnIndex: number, lineNumber: number) =>
      lineNumber - 1 + result.gapLineCountsByColumn[columnIndex]!
        .filter((gap) => gap.lineNumber <= lineNumber)
        .reduce((total, gap) => total + gap.count, 0);

    expect(previousLines[123]).toBe("    @Override");
    expect(currentLines[104]).toBe("    @Override");
    expect(alignedRowForLine(0, 124)).toBe(alignedRowForLine(1, 105));
    expect(alignedRowForLine(0, 124)).toBe(123);
  });
});

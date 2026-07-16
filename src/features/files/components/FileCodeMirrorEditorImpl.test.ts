/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { resolveFileCompareLineGapHeight } from "./FileCodeMirrorEditorImpl";

describe("resolveFileCompareLineGapHeight", () => {
  it("uses CodeMirror's measured fractional line height without rounding", () => {
    expect(resolveFileCompareLineGapHeight(19, 18.203125)).toBe(345.859375);
  });

  it("does not produce negative widget geometry", () => {
    expect(resolveFileCompareLineGapHeight(-1, 18)).toBe(0);
    expect(resolveFileCompareLineGapHeight(4, -1)).toBe(0);
  });
});

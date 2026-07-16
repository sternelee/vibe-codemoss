import { describe, expect, it } from "vitest";
import {
  isStrictTabPermutation,
  reorderTabPathsAtTarget,
} from "./fileTabOrder";

describe("file tab order", () => {
  it("inserts a dragged tab before the target tab", () => {
    expect(reorderTabPathsAtTarget(["A", "B", "C"], "A", "C")).toEqual([
      "B",
      "A",
      "C",
    ]);
    expect(reorderTabPathsAtTarget(["A", "B", "C"], "C", "A")).toEqual([
      "C",
      "A",
      "B",
    ]);
  });

  it("rejects duplicate paths as invalid permutations", () => {
    expect(isStrictTabPermutation(["A", "A"], ["A", "B"])).toBe(false);
    expect(isStrictTabPermutation(["A", "B"], ["A", "A"])).toBe(false);
    expect(isStrictTabPermutation(["B", "A"], ["A", "B"])).toBe(true);
  });
});

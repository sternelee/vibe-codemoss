import { describe, expect, it } from "vitest";
import { projectSidebarThreadStatus } from "./useSidebarThreadStatusProjection";

describe("projectSidebarThreadStatus", () => {
  it("projects only the sidebar-relevant boolean flags", () => {
    const projected = projectSidebarThreadStatus(null, {
      "t-1": {
        isProcessing: true,
        hasUnread: false,
        isReviewing: false,
      },
    });
    expect(projected).toEqual({
      "t-1": { isProcessing: true, hasUnread: false, isReviewing: false },
    });
  });

  it("reuses the previous reference when only non-projected fields change", () => {
    const first = projectSidebarThreadStatus(null, {
      "t-1": { isProcessing: true, hasUnread: false, isReviewing: false },
    });
    // 模拟 heartbeatPulse 等字段变化：源对象换引用，但布尔位不变。
    const second = projectSidebarThreadStatus(first, {
      "t-1": { isProcessing: true, hasUnread: false, isReviewing: false },
    });
    expect(second).toBe(first);
  });

  it("returns a new reference when any boolean flag flips", () => {
    const first = projectSidebarThreadStatus(null, {
      "t-1": { isProcessing: true, hasUnread: false, isReviewing: false },
    });
    const second = projectSidebarThreadStatus(first, {
      "t-1": { isProcessing: false, hasUnread: true, isReviewing: false },
    });
    expect(second).not.toBe(first);
    expect(second["t-1"]).toEqual({
      isProcessing: false,
      hasUnread: true,
      isReviewing: false,
    });
  });

  it("returns a new reference when threads are added or removed", () => {
    const first = projectSidebarThreadStatus(null, {
      "t-1": { isProcessing: false, hasUnread: false, isReviewing: false },
    });
    const withAdded = projectSidebarThreadStatus(first, {
      "t-1": { isProcessing: false, hasUnread: false, isReviewing: false },
      "t-2": { isProcessing: true, hasUnread: false, isReviewing: false },
    });
    expect(withAdded).not.toBe(first);
    // 未变化的行保持行级引用稳定，便于行级 memo。
    expect(withAdded["t-1"]).toBe(first["t-1"]);

    const withRemoved = projectSidebarThreadStatus(withAdded, {
      "t-2": { isProcessing: true, hasUnread: false, isReviewing: false },
    });
    expect(withRemoved).not.toBe(withAdded);
    expect(Object.keys(withRemoved)).toEqual(["t-2"]);
  });

  it("treats missing flags as false", () => {
    const projected = projectSidebarThreadStatus(null, { "t-1": {} });
    expect(projected["t-1"]).toEqual({
      isProcessing: false,
      hasUnread: false,
      isReviewing: false,
    });
  });
});

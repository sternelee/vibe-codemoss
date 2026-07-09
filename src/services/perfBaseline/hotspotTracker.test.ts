// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetHotspotTrackerForTests,
  getRecentHotspotSummary,
  recordHotspotSample,
  trackHotspot,
} from "./hotspotTracker";

describe("hotspotTracker", () => {
  let now = 0;

  beforeEach(() => {
    now = 10_000;
    __resetHotspotTrackerForTests();
    vi.spyOn(performance, "now").mockImplementation(() => now);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("aggregates samples by category, sorted by total time", () => {
    recordHotspotSample("realtime-delta-flush", 10, "ops=5");
    recordHotspotSample("realtime-delta-flush", 30, "ops=40");
    recordHotspotSample("client-store-write", 8, "app:foo");
    const summary = getRecentHotspotSummary(1_000);
    expect(summary[0]).toMatchObject({
      category: "realtime-delta-flush",
      count: 2,
      totalMs: 40,
      maxMs: 30,
      maxDetail: "ops=40",
    });
    expect(summary[1]).toMatchObject({
      category: "client-store-write",
      count: 1,
      totalMs: 8,
    });
  });

  it("drops samples below the 1ms floor", () => {
    recordHotspotSample("react-commit", 0.5);
    expect(getRecentHotspotSummary(1_000)).toEqual([]);
  });

  it("keeps samples at or above the 1ms floor", () => {
    recordHotspotSample("react-commit", 1.2);
    expect(getRecentHotspotSummary(1_000)).toHaveLength(1);
  });

  it("aggregates detailed timeline render probes", () => {
    recordHotspotSample("timeline-row-measure", 18, "entry:active:index=10");
    recordHotspotSample("timeline-active-row-render", 42, "entry:assistant:1200ch");

    const summary = getRecentHotspotSummary(1_000);

    expect(summary).toEqual([
      expect.objectContaining({
        category: "timeline-active-row-render",
        totalMs: 42,
        maxDetail: "entry:assistant:1200ch",
      }),
      expect.objectContaining({
        category: "timeline-row-measure",
        totalMs: 18,
        maxDetail: "entry:active:index=10",
      }),
    ]);
  });

  it("excludes samples outside the aggregation window", () => {
    recordHotspotSample("react-commit", 20);
    now += 5_000;
    recordHotspotSample("react-commit", 6);
    const summary = getRecentHotspotSummary(1_000);
    expect(summary).toHaveLength(1);
    expect(summary[0]).toMatchObject({ count: 1, totalMs: 6 });
  });

  it("trackHotspot measures the wrapped sync work and returns its result", () => {
    const result = trackHotspot("normalized-realtime-flush", "ops=3", () => {
      now += 12;
      return "done";
    });
    expect(result).toBe("done");
    const summary = getRecentHotspotSummary(1_000);
    expect(summary[0]).toMatchObject({
      category: "normalized-realtime-flush",
      totalMs: 12,
      maxDetail: "ops=3",
    });
  });
});

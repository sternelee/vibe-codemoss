// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import {
  __resetHotspotTrackerForTests,
  getRecentHotspotSummary,
} from "./hotspotTracker";
import { useRenderHotspot } from "./useRenderHotspot";

function HotspotProbe({
  detail,
  enabled,
}: {
  detail: string;
  enabled?: boolean;
}) {
  useRenderHotspot("react-render", detail, enabled ?? true);
  return <div>probe</div>;
}

describe("useRenderHotspot", () => {
  let now = 0;

  beforeEach(() => {
    now = 1_000;
    __resetHotspotTrackerForTests();
    vi.spyOn(performance, "now").mockImplementation(() => {
      const current = now;
      now += 2;
      return current;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("records render-to-layoutEffect duration for production-style attribution", () => {
    render(<HotspotProbe detail="markdown:1200ch" />);
    const summary = getRecentHotspotSummary(10_000);
    expect(summary.some((row) => row.category === "react-render")).toBe(true);
  });

  it("skips recording when disabled", () => {
    render(<HotspotProbe detail="off" enabled={false} />);
    expect(getRecentHotspotSummary(10_000)).toEqual([]);
  });
});

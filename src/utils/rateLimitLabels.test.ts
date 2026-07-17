import { describe, expect, it } from "vitest";
import { formatRateLimitWindowLabel } from "./rateLimitLabels";

describe("formatRateLimitWindowLabel", () => {
  it.each([
    [300, "5h limit"],
    [10080, "Weekly limit"],
    [720, "12h limit"],
    [2880, "2d limit"],
    [90, "90m limit"],
  ])("formats a %s-minute window as %s", (windowDurationMins, expected) => {
    expect(formatRateLimitWindowLabel(windowDurationMins)).toBe(expected);
  });

  it.each([undefined, null, Number.NaN, Number.POSITIVE_INFINITY, 0, -60, 0.4])(
    "falls back for invalid duration %s",
    (windowDurationMins) => {
      expect(formatRateLimitWindowLabel(windowDurationMins)).toBe("Rate limit");
    },
  );
});

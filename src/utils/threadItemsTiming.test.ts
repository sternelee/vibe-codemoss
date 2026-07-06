import { describe, expect, it } from "vitest";
import {
  extractAssistantFinalFlag,
  extractFinalCompletedAtMs,
  extractFinalDurationMs,
  extractHistoryItemTimestampMs,
  getThreadTimestamp,
  parseTimestampLikeMs,
} from "./threadItemsTiming";

describe("threadItemsTiming", () => {
  it("normalizes thread timestamps from seconds, milliseconds, and ISO strings", () => {
    expect(getThreadTimestamp({ updated_at: 1_735_689_600 })).toBe(1_735_689_600_000);
    expect(getThreadTimestamp({ updatedAt: 1_735_689_600_000 })).toBe(1_735_689_600_000);
    expect(getThreadTimestamp({ updated_at: "2025-01-01T00:00:00Z" })).toBe(
      Date.parse("2025-01-01T00:00:00Z"),
    );
  });

  it("rejects invalid or non-positive timestamp values", () => {
    expect(getThreadTimestamp({ updated_at: "not-a-date" })).toBe(0);
    expect(parseTimestampLikeMs(0)).toBeUndefined();
    expect(parseTimestampLikeMs("")).toBeUndefined();
  });

  it("extracts assistant final flags from direct and metadata fields", () => {
    expect(extractAssistantFinalFlag({ is_final: "yes" })).toBe(true);
    expect(extractAssistantFinalFlag({ metadata: { isFinalMessage: 0 } })).toBe(false);
    expect(extractAssistantFinalFlag({ metadata: { isFinal: "maybe" } })).toBeUndefined();
  });

  it("extracts final completion timestamps from direct or metadata fields", () => {
    expect(extractFinalCompletedAtMs({ completed_at: 1_735_689_600 })).toBe(
      1_735_689_600_000,
    );
    expect(
      extractFinalCompletedAtMs({
        metadata: { finalCompletedAt: "2025-01-01T00:00:00Z" },
      }),
    ).toBe(Date.parse("2025-01-01T00:00:00Z"));
  });

  it("extracts non-negative final durations", () => {
    expect(extractFinalDurationMs({ final_duration_ms: "1234" })).toBe(1234);
    expect(extractFinalDurationMs({ durationMs: -1, metadata: { duration_ms: 0 } })).toBe(0);
    expect(extractFinalDurationMs({ durationMs: "invalid" })).toBeUndefined();
  });

  it("extracts history item timestamps from direct or metadata fields", () => {
    expect(extractHistoryItemTimestampMs({ timestamp_ms: 1_735_689_600_000 })).toBe(
      1_735_689_600_000,
    );
    expect(
      extractHistoryItemTimestampMs({
        metadata: { updated_at: "2025-01-01T00:00:00Z" },
      }),
    ).toBe(Date.parse("2025-01-01T00:00:00Z"));
  });
});

import { describe, expect, it } from "vitest";
import {
  GIT_HISTORY_AUTHOR_PALETTE_SIZE,
  getGitHistoryAuthorColorSlot,
} from "./gitHistoryAuthorPalette";

describe("getGitHistoryAuthorColorSlot", () => {
  it("normalizes email identity and prioritizes it over display name", () => {
    const baselineSlot = getGitHistoryAuthorColorSlot("alice@example.com", "Alice");

    expect(getGitHistoryAuthorColorSlot("  ALICE@EXAMPLE.COM  ", "Renamed Alice")).toBe(
      baselineSlot,
    );
  });

  it("falls back to normalized author name and then the default slot", () => {
    expect(getGitHistoryAuthorColorSlot(undefined, "  Alice  ")).toBe(
      getGitHistoryAuthorColorSlot(null, "alice"),
    );
    expect(getGitHistoryAuthorColorSlot(" ", " ")).toBe(0);
    expect(getGitHistoryAuthorColorSlot(undefined, undefined)).toBe(0);
  });

  it("maps known distinct identities to stable palette slots", () => {
    const aliceSlot = getGitHistoryAuthorColorSlot("alice@example.com", "Alice");
    const bobSlot = getGitHistoryAuthorColorSlot("bob@example.com", "Bob");

    expect(aliceSlot).toBe(getGitHistoryAuthorColorSlot("alice@example.com", "Alice"));
    expect(bobSlot).toBe(getGitHistoryAuthorColorSlot("bob@example.com", "Bob"));
    expect(aliceSlot).not.toBe(bobSlot);
    expect(aliceSlot).toBeGreaterThanOrEqual(0);
    expect(aliceSlot).toBeLessThan(GIT_HISTORY_AUTHOR_PALETTE_SIZE);
    expect(bobSlot).toBeGreaterThanOrEqual(0);
    expect(bobSlot).toBeLessThan(GIT_HISTORY_AUTHOR_PALETTE_SIZE);
  });
});

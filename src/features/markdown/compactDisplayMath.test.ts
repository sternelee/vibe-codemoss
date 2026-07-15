import { describe, expect, it } from "vitest";
import { normalizeCompactMultiLineDisplayMath } from "./compactDisplayMath";

describe("normalizeCompactMultiLineDisplayMath", () => {
  it("canonicalizes a trusted compact aligned block and separates trailing prose", () => {
    const value = [
      String.raw`$$\begin{aligned}`,
      String.raw`x &= y + 1 \\`,
      String.raw`z &= x^2`,
      String.raw`\end{aligned}$$ 后续说明。`,
    ].join("\n");

    expect(normalizeCompactMultiLineDisplayMath(value)).toEqual({
      value: [
        "$$",
        String.raw`\begin{aligned}`,
        String.raw`x &= y + 1 \\`,
        String.raw`z &= x^2`,
        String.raw`\end{aligned}`,
        "$$",
        "后续说明。",
      ].join("\n"),
      hasUnresolvedCandidate: false,
    });
  });

  it("keeps an unmatched compact opener unchanged", () => {
    const value = [
      String.raw`$$\begin{aligned}`,
      String.raw`x &= y + 1`,
      "后续说明。",
    ].join("\n");

    expect(normalizeCompactMultiLineDisplayMath(value)).toEqual({
      value,
      hasUnresolvedCandidate: true,
    });
  });

  it("rejects nested compact openers instead of guessing a pairing", () => {
    const value = [
      String.raw`$$\begin{aligned}`,
      String.raw`$$\begin{cases}`,
      String.raw`x &= 1`,
      String.raw`\end{cases}$$`,
      String.raw`\end{aligned}$$`,
    ].join("\n");

    expect(normalizeCompactMultiLineDisplayMath(value)).toEqual({
      value,
      hasUnresolvedCandidate: true,
    });
  });

  it("rejects a closer from a different blockquote container", () => {
    const value = [
      String.raw`> $$\begin{aligned}`,
      String.raw`> x &= 1`,
      String.raw`\end{aligned}$$`,
    ].join("\n");

    expect(normalizeCompactMultiLineDisplayMath(value)).toEqual({
      value,
      hasUnresolvedCandidate: true,
    });
  });

  it("rejects an unsafe trailing token after the compact closer", () => {
    const value = [
      String.raw`$$\begin{aligned}`,
      String.raw`x &= 1`,
      String.raw`\end{aligned}$$identifier`,
    ].join("\n");

    expect(normalizeCompactMultiLineDisplayMath(value)).toEqual({
      value,
      hasUnresolvedCandidate: true,
    });
  });

  it("separates English prose when whitespace follows the compact closer", () => {
    const value = [
      String.raw`$$\begin{aligned}`,
      String.raw`x &= 1`,
      String.raw`\end{aligned}$$ Result`,
    ].join("\n");

    expect(normalizeCompactMultiLineDisplayMath(value).value).toBe([
      "$$",
      String.raw`\begin{aligned}`,
      String.raw`x &= 1`,
      String.raw`\end{aligned}`,
      "$$",
      "Result",
    ].join("\n"));
  });
});

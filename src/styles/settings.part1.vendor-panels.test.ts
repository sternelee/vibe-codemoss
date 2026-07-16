import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const vendorPanelsCss = readFileSync(
  fileURLToPath(new URL("./settings.part1.vendor-panels.css", import.meta.url)),
  "utf8",
);

function getCssRuleBlock(css: string, selector: string): string {
  const escapedSelector = selector
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`));
  return match?.[1] ?? "";
}

describe("vendor settings panel compact layout", () => {
  it("keeps the engine list and icons compact but readable", () => {
    const navRule = getCssRuleBlock(vendorPanelsCss, ".vendor-engine-nav");
    const tabRule = getCssRuleBlock(vendorPanelsCss, ".vendor-engine-tab");
    const iconRule = getCssRuleBlock(vendorPanelsCss, ".vendor-engine-icon");
    const logoRule = getCssRuleBlock(vendorPanelsCss, ".vendor-cli-logo-img");

    expect(navRule).toContain("width: 204px;");
    expect(tabRule).toContain("min-height: 40px;");
    expect(tabRule).toContain("font-size: 13px;");
    expect(tabRule).toContain("gap: 8px;");
    expect(iconRule).toContain("width: 30px;");
    expect(iconRule).toContain("height: 30px;");
    expect(logoRule).toContain("width: 16px;");
    expect(logoRule).toContain("height: 16px;");
  });
});

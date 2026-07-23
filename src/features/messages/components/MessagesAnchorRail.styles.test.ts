import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("MessagesAnchorRail styles", () => {
  it("hides the anchor rail from the conversation container width", () => {
    const shellCss = readFileSync(
      resolve(process.cwd(), "src/styles/messages.part1-shell.css"),
      "utf8",
    );
    const statusCss = readFileSync(
      resolve(process.cwd(), "src/styles/messages.status-shell.css"),
      "utf8",
    );

    expect(shellCss).toMatch(/\.messages-shell\s*\{[\s\S]*container-type:\s*inline-size;/);
    expect(statusCss).toMatch(
      /@container\s*\(max-width:\s*960px\)\s*\{[\s\S]*\.messages-anchor-rail\s*\{[\s\S]*display:\s*none;/,
    );
  });
});

describe("conversation lightweight typography", () => {
  it("keeps lightweight banner and row titles at regular text emphasis", () => {
    const shellCss = readFileSync(
      resolve(process.cwd(), "src/styles/messages.part1-shell.css"),
      "utf8",
    );
    const promptSource = readFileSync(
      resolve(
        process.cwd(),
        "src/features/messages/timeline/components/ConversationLightweightPrompt.tsx",
      ),
      "utf8",
    );
    const rowRendererSource = readFileSync(
      resolve(
        process.cwd(),
        "src/features/messages/timeline/components/TimelineRowRenderer.tsx",
      ),
      "utf8",
    );

    expect(promptSource).not.toContain("<strong>{t(titleKey)}</strong>");
    expect(rowRendererSource).not.toContain(
      '<strong>\n            {t("messages.conversationLightweightRowTitle"',
    );
    expect(shellCss).not.toMatch(
      /\.messages-lightweight-mode-banner\s+strong,[\s\S]*?font-size:\s*var\(--message-title-font-size\)/,
    );
    expect(shellCss).not.toMatch(
      /\.messages-lightweight-row-summary-main\s*>\s*strong,[\s\S]*?white-space:\s*nowrap;/,
    );
  });
});

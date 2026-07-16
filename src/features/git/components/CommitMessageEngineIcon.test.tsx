import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CommitMessageEngineIcon } from "./CommitMessageEngineIcon";

describe("CommitMessageEngineIcon", () => {
  it("renders the Codex commit generator icon as a monochrome glyph", () => {
    const markup = renderToStaticMarkup(
      <CommitMessageEngineIcon engine="codex" size={14} />,
    );

    expect(markup).toContain('fill="currentColor"');
    expect(markup).not.toContain("#10A37F");
    expect(markup).not.toContain("#10a37f");
  });
});

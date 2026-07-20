// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { svgToDataUrl } from "./svgToDataUrl";

const DATA_URL_PREFIX = "data:image/svg+xml;base64,";

function decodeSvgDataUrl(dataUrl: string): string {
  expect(dataUrl.startsWith(DATA_URL_PREFIX)).toBe(true);
  const binary = atob(dataUrl.slice(DATA_URL_PREFIX.length));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function parseSvgXml(svg: string): Document {
  return new DOMParser().parseFromString(svg, "image/svg+xml");
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("svgToDataUrl", () => {
  it("serializes HTML void elements and named entities as valid SVG XML", () => {
    const svg = [
      '<svg xmlns="http://www.w3.org/2000/svg">',
      '<foreignObject><div xmlns="http://www.w3.org/1999/xhtml">',
      "<p>One<br>Two<hr><img src=\"x\"><input><wbr>&nbsp;End</p>",
      "</div></foreignObject></svg>",
    ].join("");

    const serializedSvg = decodeSvgDataUrl(svgToDataUrl(svg));
    const parsedSvg = parseSvgXml(serializedSvg);

    expect(parsedSvg.querySelector("parsererror")).toBeNull();
    expect(serializedSvg).not.toContain("&nbsp;");
    expect(parsedSvg.querySelector("br")).not.toBeNull();
    expect(parsedSvg.querySelector("hr")).not.toBeNull();
    expect(parsedSvg.querySelector("img")).not.toBeNull();
    expect(parsedSvg.querySelector("input")).not.toBeNull();
    expect(parsedSvg.querySelector("wbr")).not.toBeNull();
  });

  it("preserves Unicode labels through UTF-8 Base64 encoding", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><text>中文 日本語 😀</text></svg>';

    const serializedSvg = decodeSvgDataUrl(svgToDataUrl(svg));

    expect(serializedSvg).toContain("中文 日本語 😀");
    expect(parseSvgXml(serializedSvg).querySelector("parsererror")).toBeNull();
  });

  it("keeps valid SVG XML parseable", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>';

    const serializedSvg = decodeSvgDataUrl(svgToDataUrl(svg));
    const parsedSvg = parseSvgXml(serializedSvg);

    expect(parsedSvg.querySelector("parsererror")).toBeNull();
    expect(parsedSvg.querySelector("rect")).not.toBeNull();
  });

  it("returns an empty string for empty input", () => {
    expect(svgToDataUrl("")).toBe("");
  });

  it("falls back to the original encoding when no SVG root exists", () => {
    const markup = "<div>not an svg</div>";

    expect(decodeSvgDataUrl(svgToDataUrl(markup))).toBe(markup);
  });

  it("falls back to the original encoding without XMLSerializer", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><br></svg>';
    vi.stubGlobal("XMLSerializer", undefined);

    expect(decodeSvgDataUrl(svgToDataUrl(svg))).toBe(svg);
  });

  it("reports serialization exceptions without exposing SVG content", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><text>private-label</text></svg>';
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    class ThrowingXmlSerializer {
      serializeToString(): string {
        throw new Error("private-label");
      }
    }
    vi.stubGlobal("XMLSerializer", ThrowingXmlSerializer);

    expect(decodeSvgDataUrl(svgToDataUrl(svg))).toBe(svg);
    expect(warnSpy).toHaveBeenCalledWith(
      "[mermaid-fullscreen] svg-xml-serialization-fallback",
      {
        errorName: "Error",
        svgLength: svg.length,
      },
    );
    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain("private-label");
  });
});

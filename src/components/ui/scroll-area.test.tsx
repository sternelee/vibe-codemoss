// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { StrictMode, createRef } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ScrollArea } from "./scroll-area";
import { TooltipIconButton } from "./tooltip-icon-button";

type PackageManifest = {
  overrides?: Record<string, Record<string, string>>;
};

type PackageLock = {
  packages?: Record<string, { version?: string }>;
};

const readProjectJson = <Value,>(relativePath: string): Value =>
  JSON.parse(
    readFileSync(resolve(process.cwd(), relativePath), "utf-8"),
  ) as Value;

describe("ScrollArea React 19 stability", () => {
  it("keeps the Radix ScrollArea dependency graph on one compatible Presence patch", () => {
    const manifest = readProjectJson<PackageManifest>("package.json");
    const lockfile = readProjectJson<PackageLock>("package-lock.json");

    expect(manifest.overrides?.["radix-ui"]?.["@radix-ui/react-presence"]).toBe(
      "1.1.7",
    );
    expect(manifest.overrides?.["radix-ui"]?.["@radix-ui/react-scroll-area"]).toBe(
      "1.2.14",
    );
    expect(
      lockfile.packages?.["node_modules/@radix-ui/react-presence"]?.version,
    ).toBe("1.1.7");
    expect(
      lockfile.packages?.["node_modules/@radix-ui/react-scroll-area"]?.version,
    ).toBe("1.2.14");
    expect(
      lockfile.packages?.[
        "node_modules/@radix-ui/react-scroll-area/node_modules/@radix-ui/react-presence"
      ],
    ).toBeUndefined();
    expect(manifest.overrides?.["@radix-ui/react-presence"]).toBeUndefined();
    expect(manifest.overrides?.["@radix-ui/react-scroll-area"]).toBeUndefined();
    expect(manifest.overrides?.["@radix-ui/react-compose-refs"]).toBeUndefined();
  });

  it("keeps mounted root and viewport nodes stable across StrictMode rerenders", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const viewportRef = createRef<HTMLDivElement>();

    try {
      const { container, rerender } = render(
        <StrictMode>
          <ScrollArea viewportRef={viewportRef} style={{ height: 240 }}>
            <div data-testid="content">render 0</div>
          </ScrollArea>
        </StrictMode>,
      );
      const initialRoot = container.querySelector('[data-slot="scroll-area"]');
      const initialViewport = viewportRef.current;

      expect(initialRoot).toBeTruthy();
      expect(initialViewport).toBeTruthy();

      for (let renderIndex = 1; renderIndex <= 64; renderIndex += 1) {
        rerender(
          <StrictMode>
            <ScrollArea viewportRef={viewportRef} style={{ height: 240 }}>
              <div data-testid="content">render {renderIndex}</div>
            </ScrollArea>
          </StrictMode>,
        );
      }

      expect(container.querySelector('[data-slot="scroll-area"]')).toBe(initialRoot);
      expect(viewportRef.current).toBe(initialViewport);
      expect(
        consoleErrorSpy.mock.calls.some((call) =>
          call.some((entry) =>
            /Maximum update depth exceeded|Minified React error #185/.test(String(entry)),
          ),
        ),
      ).toBe(false);
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("keeps a multi-workspace Sidebar surface stable across StrictMode rerenders", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const viewportRef = createRef<HTMLDivElement>();

    const renderSidebarRows = (renderIndex: number) => (
      <StrictMode>
        <ScrollArea viewportRef={viewportRef} style={{ height: 240 }}>
          {Array.from({ length: 8 }, (_, rowIndex) => (
            <div data-workspace-row={rowIndex} key={rowIndex}>
              <span>workspace {rowIndex}</span>
              <TooltipIconButton
                aria-label={`workspace ${rowIndex} actions`}
                label={`render ${renderIndex}`}
              >
                ···
              </TooltipIconButton>
            </div>
          ))}
        </ScrollArea>
      </StrictMode>
    );

    try {
      const { container, rerender } = render(renderSidebarRows(0));
      const initialRoot = container.querySelector('[data-slot="scroll-area"]');
      const initialViewport = viewportRef.current;

      expect(initialRoot).toBeTruthy();
      expect(initialViewport).toBeTruthy();
      expect(container.querySelectorAll("[data-workspace-row]")).toHaveLength(8);

      for (let renderIndex = 1; renderIndex <= 64; renderIndex += 1) {
        rerender(renderSidebarRows(renderIndex));
      }

      expect(container.querySelector('[data-slot="scroll-area"]')).toBe(initialRoot);
      expect(viewportRef.current).toBe(initialViewport);
      expect(
        consoleErrorSpy.mock.calls.some((call) =>
          call.some((entry) =>
            /Maximum update depth exceeded|Minified React error #185/.test(String(entry)),
          ),
        ),
      ).toBe(false);
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});

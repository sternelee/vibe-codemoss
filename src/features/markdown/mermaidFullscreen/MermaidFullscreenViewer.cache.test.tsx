// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

type ViewerMockOptions = {
  shown?: () => void;
};

type ViewerMockInstance = {
  show: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

const {
  constructedSources,
  svgToDataUrlMock,
  viewerConstructorMock,
  viewerInstances,
} = vi.hoisted(() => {
  const sourceSnapshots: string[] = [];
  const instances: ViewerMockInstance[] = [];
  const toDataUrl = vi.fn(
    (svg: string) => `data:image/svg+xml;base64,${btoa(svg)}`,
  );
  const constructorMock = vi.fn().mockImplementation(
    (element: HTMLImageElement, options: ViewerMockOptions) => {
      sourceSnapshots.push(element.src);
      const instance: ViewerMockInstance = {
        show: vi.fn(() => options.shown?.()),
        destroy: vi.fn(),
        update: vi.fn(),
      };
      instances.push(instance);
      return instance;
    },
  );
  return {
    constructedSources: sourceSnapshots,
    svgToDataUrlMock: toDataUrl,
    viewerConstructorMock: constructorMock,
    viewerInstances: instances,
  };
});

vi.mock("./svgToDataUrl", () => ({
  svgToDataUrl: svgToDataUrlMock,
}));

vi.mock("viewerjs", () => ({
  default: viewerConstructorMock,
}));

import MermaidFullscreenViewer from "./MermaidFullscreenViewer";
import { destroyActiveViewer } from "./activeViewer";

const SVG_A =
  '<svg xmlns="http://www.w3.org/2000/svg"><text>A</text></svg>';
const SVG_B =
  '<svg xmlns="http://www.w3.org/2000/svg"><text>B</text></svg>';

afterEach(() => {
  destroyActiveViewer();
  constructedSources.length = 0;
  viewerInstances.length = 0;
  vi.clearAllMocks();
});

describe("MermaidFullscreenViewer Data URL cache", () => {
  it("normalizes outside render and reuses the latest SVG across rerender and reopen", async () => {
    const onClose = vi.fn();
    const view = render(
      <MermaidFullscreenViewer open svg={SVG_A} onClose={onClose} />,
    );

    expect(svgToDataUrlMock).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(viewerConstructorMock).toHaveBeenCalledTimes(1);
    });
    expect(svgToDataUrlMock).toHaveBeenCalledTimes(1);
    expect(constructedSources[0]).toBe(svgToDataUrlMock.mock.results[0]?.value);

    view.rerender(
      <MermaidFullscreenViewer open svg={SVG_A} onClose={() => undefined} />,
    );
    expect(svgToDataUrlMock).toHaveBeenCalledTimes(1);

    view.rerender(
      <MermaidFullscreenViewer open={false} svg={SVG_A} onClose={onClose} />,
    );
    view.rerender(
      <MermaidFullscreenViewer open svg={SVG_A} onClose={onClose} />,
    );
    await waitFor(() => {
      expect(viewerConstructorMock).toHaveBeenCalledTimes(2);
    });
    expect(svgToDataUrlMock).toHaveBeenCalledTimes(1);

    view.rerender(
      <MermaidFullscreenViewer open svg={SVG_B} onClose={onClose} />,
    );
    await waitFor(() => {
      expect(viewerConstructorMock).toHaveBeenCalledTimes(3);
    });
    expect(svgToDataUrlMock).toHaveBeenCalledTimes(2);
    expect(svgToDataUrlMock).toHaveBeenLastCalledWith(SVG_B);
    expect(constructedSources[2]).toBe(svgToDataUrlMock.mock.results[1]?.value);
  });
});

// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Markdown } from "./Markdown";

describe("Markdown streaming outline extraction", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("throttles live partial outline updates and converges after the stream settles", async () => {
    vi.useFakeTimers();
    const onOutlineReady = vi.fn();
    const { rerender } = render(
      <Markdown
        value="# Start"
        liveRenderMode="lightweight"
        streamingThrottleMs={100}
        onOutlineReady={onOutlineReady}
      />,
    );

    expect(onOutlineReady).toHaveBeenLastCalledWith([
      expect.objectContaining({ title: "Start" }),
    ]);
    const initialCallCount = onOutlineReady.mock.calls.length;

    rerender(
      <Markdown
        value={"# Start\n\n## Partial"}
        liveRenderMode="lightweight"
        streamingThrottleMs={100}
        onOutlineReady={onOutlineReady}
      />,
    );
    rerender(
      <Markdown
        value={"# Start\n\n## Final"}
        liveRenderMode="lightweight"
        streamingThrottleMs={100}
        onOutlineReady={onOutlineReady}
      />,
    );

    expect(onOutlineReady).toHaveBeenCalledTimes(initialCallCount);

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(onOutlineReady).toHaveBeenLastCalledWith([
      expect.objectContaining({ title: "Start" }),
      expect.objectContaining({ title: "Final" }),
    ]);
  });
});

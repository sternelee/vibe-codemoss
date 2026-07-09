import { useLayoutEffect, useRef } from "react";
import { recordHotspotSample, type HotspotCategory } from "./hotspotTracker";

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/**
 * 打包版 React.Profiler.onRender 是 no-op;用 render→layoutEffect 差值近似
 * 单次 commit 的同步渲染耗时(含子树 reconcile,不含 paint)。
 */
export function useRenderHotspot(
  category: HotspotCategory,
  detail: string,
  enabled = true,
): void {
  const startedAtRef = useRef(0);
  if (enabled) {
    startedAtRef.current = nowMs();
  }
  useLayoutEffect(() => {
    if (!enabled) {
      return;
    }
    recordHotspotSample(category, nowMs() - startedAtRef.current, detail);
  });
}

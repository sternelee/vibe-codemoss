// 主线程热路径计时器(纯内存环形缓冲,零依赖、零写盘)。
//
// 背景:macOS WKWebView 不支持 PerformanceObserver('longtask'),掉帧瞬间只知道
// "掉了多少帧"和"谁在重渲染",不知道主线程时间被哪段 JS 消耗。本模块让各热路径
// (realtime delta flush、client store 写盘、React commit 等)用 performance.now 差值
// 打点,frameDropMonitor 在掉帧瞬间读取"最近一小段时间的耗时 top 榜",直接回答
// "卡顿的那一刻 JS 在干什么"。
//
// 设计约束:
// - 不 import 任何项目模块(clientStorage / rendererDiagnostics 都会反向依赖形成循环)。
// - 常态开销可忽略:每次记录只有一次数组 push;低于 MIN_RECORD_MS 的样本直接丢弃。
// - 只在内存保留最近 MAX_SAMPLES 条,不落盘;掉帧现场由 frameDropMonitor 聚合后写诊断。

export type HotspotCategory =
  | "realtime-delta-flush"
  | "normalized-realtime-flush"
  | "codex-batcher-flush"
  | "client-store-write"
  | "react-commit"
  | "react-render"
  | "diagnostics-persist"
  | "diagnostics-export"
  | "perf-jank-live-collect"
  | "markdown-lightweight-parse"
  | "markdown-render"
  | "markdown-complexity"
  | "message-row-render"
  | "timeline-active-row-render"
  | "timeline-list-render"
  | "timeline-row-measure";

export type HotspotSample = {
  category: HotspotCategory;
  durationMs: number;
  at: number;
  /** 可选补充信息,如 store 名 / 事件条数 / Profiler id。 */
  detail: string | null;
};

export type HotspotSummaryRow = {
  category: HotspotCategory;
  count: number;
  totalMs: number;
  maxMs: number;
  /** maxMs 那次样本的 detail,用于回答"最重的一次是谁"。 */
  maxDetail: string | null;
};

const MAX_SAMPLES = 600;
// 1ms:打包版常见「千刀万剐」——单次 flush/parse 仅 2–3ms,但一帧内累积数十次仍会造成掉帧。
const MIN_RECORD_MS = 1;

const samples: HotspotSample[] = [];

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/** 记录一次热路径耗时样本。低于 MIN_RECORD_MS 的样本直接丢弃。 */
export function recordHotspotSample(
  category: HotspotCategory,
  durationMs: number,
  detail?: string,
): void {
  if (!Number.isFinite(durationMs) || durationMs < MIN_RECORD_MS) {
    return;
  }
  samples.push({
    category,
    durationMs,
    at: nowMs(),
    detail: detail ?? null,
  });
  if (samples.length > MAX_SAMPLES) {
    samples.splice(0, samples.length - MAX_SAMPLES);
  }
}

/** 包一段同步热路径并自动打点。 */
export function trackHotspot<T>(
  category: HotspotCategory,
  detail: string | undefined,
  run: () => T,
): T {
  const startedAt = nowMs();
  try {
    return run();
  } finally {
    recordHotspotSample(category, nowMs() - startedAt, detail);
  }
}

/** 聚合最近 windowMs 内的样本,按总耗时降序,供掉帧现场附着。 */
export function getRecentHotspotSummary(windowMs = 1_000): HotspotSummaryRow[] {
  const cutoff = nowMs() - windowMs;
  const aggregated = new Map<HotspotCategory, HotspotSummaryRow>();
  for (const sample of samples) {
    if (sample.at < cutoff) {
      continue;
    }
    const row = aggregated.get(sample.category);
    if (!row) {
      aggregated.set(sample.category, {
        category: sample.category,
        count: 1,
        totalMs: Math.round(sample.durationMs),
        maxMs: Math.round(sample.durationMs),
        maxDetail: sample.detail,
      });
      continue;
    }
    row.count += 1;
    row.totalMs += Math.round(sample.durationMs);
    if (sample.durationMs > row.maxMs) {
      row.maxMs = Math.round(sample.durationMs);
      row.maxDetail = sample.detail;
    }
  }
  return [...aggregated.values()].sort((a, b) => b.totalMs - a.totalMs);
}

export function __resetHotspotTrackerForTests(): void {
  samples.length = 0;
}

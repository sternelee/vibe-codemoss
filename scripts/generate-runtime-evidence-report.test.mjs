import test from "node:test";
import assert from "node:assert/strict";

import { runtimeEvidenceReportInternals } from "./generate-runtime-evidence-report.mjs";

const {
  buildLargeFileSummary,
  buildPerfEvidence,
  buildRealtimeSummary,
} = runtimeEvidenceReportInternals;

test("buildPerfEvidence emits unsupported evidence when browser source is missing", () => {
  const evidence = buildPerfEvidence([
    { path: "docs/perf/long-list-browser-scroll.json", fragment: null },
  ]);

  assert.equal(evidence.length, 1);
  assert.deepEqual(
    {
      scenario: evidence[0]?.scenario,
      metric: evidence[0]?.metric,
      value: evidence[0]?.value,
      evidenceClass: evidence[0]?.evidenceClass,
    },
    {
      scenario: "S-LL-1000",
      metric: "browserScrollFrameDropPct",
      value: null,
      evidenceClass: "unsupported",
    },
  );
  assert.match(evidence[0]?.reason ?? "", /Missing source file/);
});

test("buildPerfEvidence emits unsupported evidence when baseline source is missing", () => {
  const evidence = buildPerfEvidence([
    { path: "docs/perf/baseline.json", fragment: null },
  ]);

  assert.equal(evidence.length, 1);
  assert.equal(evidence[0]?.scenario, "runtime-perf-baseline");
  assert.equal(evidence[0]?.metric, "sourceFileAvailable");
  assert.equal(evidence[0]?.evidenceClass, "unsupported");
});

test("buildPerfEvidence preserves structured budget metadata", () => {
  const evidence = buildPerfEvidence([
    {
      path: "docs/perf/baseline.json",
      fragment: {
        metrics: [
          {
            scenario: "S-CS-COLD",
            metric: "bundleSizeMain",
            value: 1200,
            unit: "bytes",
            budget: {
              observed: 1200,
              target: 1000,
              hardFail: 1500,
              unit: "bytes-gzip",
              evidenceClass: "measured",
              source: "docs/perf/baseline.json",
            },
          },
        ],
      },
    },
  ]);

  assert.equal(evidence[0]?.budget?.target, 1000);
  assert.equal(evidence[0]?.budget?.hardFail, 1500);
});

test("buildRealtimeSummary keeps malformed proxy values from looking bounded", () => {
  const summary = buildRealtimeSummary([
    {
      scenario: "S-RS-FT",
      metric: "firstTokenLatency",
      value: "unsupported",
      evidenceClass: "unsupported",
    },
  ]);

  assert.equal(summary.visibleLagRisk, "unsupported");
  assert.equal(summary.evidenceClass, "unsupported");
});

test("buildLargeFileSummary tolerates older reports without fail thresholds", () => {
  const summary = buildLargeFileSummary({
    status: "warn",
    results: [
      {
        path: "src/features/messages/components/MessagesTimeline.tsx",
        lines: 756,
        priority: "P1",
      },
    ],
  });

  assert.equal(summary.candidates.length, 1);
  assert.equal(summary.candidates[0]?.headroom, null);
});

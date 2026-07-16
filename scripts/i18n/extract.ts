/**
 * Dump the merged English translation resource into a flat map used both as the
 * canonical key list and as the source text for machine translation.
 * Run with: npx vite-node scripts/i18n/extract.ts
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import en from "../../src/i18n/locales/en";

type Flat = Record<string, string>;

function flatten(node: unknown, prefix: string, out: Flat, dottedKeys: string[]): void {
  if (typeof node === "string") {
    out[prefix] = node;
    return;
  }
  if (node && typeof node === "object" && !Array.isArray(node)) {
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (key.includes(".")) dottedKeys.push(`${prefix}>${key}`);
      flatten(value, prefix ? `${prefix}.${key}` : key, out, dottedKeys);
    }
    return;
  }
  // Non-string, non-object leaf (number/array/function) — flag it, we only expect strings.
  out[prefix] = `__NON_STRING__:${typeof node}`;
}

const out: Flat = {};
const dottedKeys: string[] = [];
flatten(en, "", out, dottedKeys);

const keys = Object.keys(out);
const nonString = keys.filter((k) => out[k].startsWith("__NON_STRING__:"));

writeFileSync(
  resolve("scripts/i18n/.work/en.flat.json"),
  JSON.stringify(out, null, 2) + "\n",
);

const totalChars = keys.reduce((n, k) => n + out[k].length, 0);
console.log(JSON.stringify({
  keyCount: keys.length,
  totalChars,
  dottedKeyCount: dottedKeys.length,
  dottedKeysSample: dottedKeys.slice(0, 10),
  nonStringCount: nonString.length,
  nonStringSample: nonString.slice(0, 10),
}, null, 2));

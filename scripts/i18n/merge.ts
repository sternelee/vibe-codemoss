/**
 * Merge per-chunk translation outputs into one flat map for a language.
 * Reads scripts/i18n/.work/<lang>/chunk-*.json, writes .work/<lang>.flat.json.
 * Usage: npx vite-node scripts/i18n/merge.ts <langCode>
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const lang = process.argv[2];
if (!lang) {
  console.error("Usage: vite-node scripts/i18n/merge.ts <langCode>");
  process.exit(1);
}
const dir = resolve(`scripts/i18n/.work/${lang}`);
const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
const merged: Record<string, string> = {};
for (const f of files) {
  const part: Record<string, string> = JSON.parse(readFileSync(resolve(dir, f), "utf8"));
  for (const [k, v] of Object.entries(part)) merged[k] = v;
}
writeFileSync(
  resolve(`scripts/i18n/.work/${lang}.flat.json`),
  JSON.stringify(merged, null, 2) + "\n",
);
console.log(JSON.stringify({ lang, files: files.length, keys: Object.keys(merged).length }));

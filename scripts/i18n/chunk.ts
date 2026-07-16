/**
 * Split the flat English source into ordered chunks for parallel translation.
 * Usage: npx vite-node scripts/i18n/chunk.ts [chunkSize=500]
 */
import { mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const size = Number(process.argv[2] ?? 500);
const flat: Record<string, string> = JSON.parse(
  readFileSync(resolve("scripts/i18n/.work/en.flat.json"), "utf8"),
);
const entries = Object.entries(flat);
const dir = resolve("scripts/i18n/.work/chunks");
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

let n = 0;
for (let i = 0; i < entries.length; i += size) {
  const slice = Object.fromEntries(entries.slice(i, i + size));
  const name = `chunk-${String(n).padStart(2, "0")}.json`;
  writeFileSync(resolve(dir, name), JSON.stringify(slice, null, 2) + "\n");
  n += 1;
}
console.log(JSON.stringify({ chunkSize: size, chunks: n, keys: entries.length }));

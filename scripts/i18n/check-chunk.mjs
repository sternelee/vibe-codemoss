import { readFileSync } from "node:fs";
const [,, lang, nn] = process.argv;
const src = JSON.parse(readFileSync(`scripts/i18n/.work/chunks/chunk-${nn}.json`, "utf8"));
const out = JSON.parse(readFileSync(`scripts/i18n/.work/${lang}/chunk-${nn}.json`, "utf8"));
const ph = (s) => (s.match(/\{\{[^}]+\}\}/g) ?? []).slice().sort().join("|");
const sk = Object.keys(src), ok = Object.keys(out);
const missing = sk.filter((k) => !(k in out));
const extra = ok.filter((k) => !(k in src));
const phBad = sk.filter((k) => k in out && ph(src[k]) !== ph(out[k]));
const untranslated = sk.filter((k) => k in out && src[k] === out[k] && /[a-zA-Z]{4,}/.test(src[k]));
console.log(JSON.stringify({
  lang, chunk: nn, srcKeys: sk.length, outKeys: ok.length,
  missing: missing.length, extra: extra.length, placeholderMismatch: phBad.length,
  phBadSample: phBad.slice(0,5),
  identicalToEnglish: untranslated.length, identicalSample: untranslated.slice(0,6),
}, null, 2));

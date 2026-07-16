export const meta = {
  name: 'localize-all-languages',
  description: 'Machine-translate all UI strings into 8 languages, chunk by chunk, each agent writing its own output file',
  phases: [{ title: 'Translate' }],
}

// Languages to produce (English + Simplified Chinese already ship real bundles).
const LANGS = args?.langs ?? [
  { code: 'zh-TW', name: 'Traditional Chinese (繁體中文, Taiwan)' },
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'ja', name: 'Japanese (日本語)' },
  { code: 'ru', name: 'Russian (Русский)' },
  { code: 'ko', name: 'Korean (한국어)' },
  { code: 'pt-BR', name: 'Portuguese (Português, Brazil)' },
]
const CHUNKS = args?.chunks ?? 14

function prompt(lang, n) {
  const nn = String(n).padStart(2, '0')
  return `You are a professional software UI localizer. Translate a chunk of UI strings from English to **${lang.name}** for a desktop AI coding assistant app (a GUI for Claude Code / Codex).

INPUT FILE (read it): \`scripts/i18n/.work/chunks/chunk-${nn}.json\`
It is a flat JSON object: \`{ "dotted.key.path": "English string", ... }\`.

OUTPUT FILE (write it): \`scripts/i18n/.work/${lang.code}/chunk-${nn}.json\`
Write a JSON object with the **exact same keys** and the **translated ${lang.name} values**.

ABSOLUTE RULES (a violation is a bug — the build will reject the file):
1. Keys are identifiers — copy every key byte-for-byte. Do NOT translate, reorder, add, or drop keys. Output must have exactly the same key set as the input.
2. Preserve every interpolation placeholder \`{{likeThis}}\` EXACTLY (same spelling, same braces). Never translate inside \`{{ }}\`, never add/remove one. You may move its position to fit grammar; the token stays identical.
3. Preserve backtick code spans, file paths, CLI commands, URLs and env var names verbatim — translate only surrounding prose.
4. Do NOT translate technical/brand names: Claude, Claude Code, Codex, Anthropic, MCP, Git, GitHub, Tauri, Markdown, Worktree, Agent, Token, JSON.
5. Preserve leading/trailing spaces and \\n newlines inside values exactly.
6. Concise UI microcopy tone; natural, standard phrasing for the target language.
7. Write ONLY valid JSON (parseable by JSON.parse) to the output file — same keys, translated values. No commentary.

After writing, confirm the output has the same number of keys as the input. Report back only the key count and that the file was written.`
}

phase('Translate')

const tasks = []
for (const lang of LANGS) {
  for (let n = 0; n < CHUNKS; n++) {
    tasks.push({ lang, n })
  }
}

const results = await parallel(
  tasks.map((t) => () =>
    agent(prompt(t.lang, t.n), {
      label: `${t.lang.code}:chunk-${String(t.n).padStart(2, '0')}`,
      phase: 'Translate',
    }),
  ),
)

const done = results.filter(Boolean).length
log(`Translated ${done}/${tasks.length} chunks across ${LANGS.length} languages`)
return { requested: tasks.length, completed: done, langs: LANGS.map((l) => l.code) }

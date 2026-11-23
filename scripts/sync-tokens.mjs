/* ---------------------------------------------------------------------------
   Gera src/tokens.lumen.css a partir do catálogo de tokens publicado.

   Fontes possíveis (TOKENS_URL):
   - https://pegaplantao-lumen-ds.netlify.app/tokens.json   (padrão)
   - http://localhost:3000/tokens.json                       (Lumen DS local)

   Uso: npm run sync:tokens
   --------------------------------------------------------------------------- */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const TOKENS_URL = process.env.TOKENS_URL ?? "https://pegaplantao-lumen-ds.netlify.app/tokens.json";
const OUTPUT_FILE = fileURLToPath(new URL("../src/tokens.lumen.css", import.meta.url));

/* Aliases do Tailwind v4, na mesma convenção do Lumen DS. */
const ALIAS_RULES = [
  ["--pp-palette-", "--color-pp-palette-"],
  ["--pp-color-", "--color-pp-"],
  ["--pp-font-family-", "--font-pp-"],
  ["--pp-font-tracking-", "--tracking-pp-"],
  ["--pp-shape-", "--radius-pp-"],
];

function aliasFor(name) {
  // --pp-font-size-text-sm -> --text-pp-sm ; --pp-font-size-small -> --text-pp-small
  if (name.startsWith("--pp-font-size-")) {
    return `--text-pp-${name.slice("--pp-font-size-".length).replace(/^text-/, "")}`;
  }

  for (const [prefix, aliasPrefix] of ALIAS_RULES) {
    if (name.startsWith(prefix)) return aliasPrefix + name.slice(prefix.length);
  }

  return null;
}

async function fetchCatalog() {
  const response = await fetch(TOKENS_URL, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) {
    throw new Error(`Não foi possível baixar ${TOKENS_URL} (HTTP ${response.status})`);
  }

  const catalog = await response.json();
  if (!Array.isArray(catalog.collections)) {
    throw new Error(`Formato inesperado em ${TOKENS_URL}: falta "collections".`);
  }

  return catalog;
}

function declarations(tokens) {
  return tokens.map((token) => `  ${token.name}: ${token.light};`).join("\n");
}

function darkDeclarations(tokens) {
  return tokens.map((token) => `  ${token.name}: ${token.dark};`).join("\n");
}

const catalog = await fetchCatalog();

/* Mantém a primeira ocorrência de cada token (a ordem segue o catálogo). */
const seen = new Set();
const collections = catalog.collections.map((collection) => ({
  name: collection.name,
  tokens: collection.tokens.filter((token) => {
    if (seen.has(token.name)) return false;
    seen.add(token.name);
    return true;
  }),
}));

const allTokens = collections.flatMap((collection) => collection.tokens);
const darkTokens = allTokens.filter((token) => token.dark !== token.light);
const aliases = allTokens
  .map((token) => ({ token, alias: aliasFor(token.name) }))
  .filter((entry) => entry.alias);

const blocks = collections
  .filter((collection) => collection.tokens.length)
  .map((collection) => `  /* ${collection.name} */\n${declarations(collection.tokens)}`)
  .join("\n\n");

const darkBlock = darkTokens.length ? `\n[data-theme="dark"] {\n${darkDeclarations(darkTokens)}\n}\n` : "";

const aliasBlock = aliases.length
  ? `\n/* Tailwind CSS v4 theme aliases. */\n@theme inline {\n${aliases
      .map(({ token, alias }) => `  ${alias}: var(${token.name});`)
      .join("\n")}\n}\n`
  : "";

const css = `/* ---------------------------------------------------------------------------
   GERADO por scripts/sync-tokens.mjs — não edite à mão.

   Fonte: ${TOKENS_URL}
   Sincronizado em: ${new Date().toISOString()}
   Tokens: ${allTokens.length} (${collections.map((collection) => `${collection.name}: ${collection.tokens.length}`).join(", ")})
   Overrides de tema escuro: ${darkTokens.length}
   Aliases do Tailwind: ${aliases.length}
   --------------------------------------------------------------------------- */

:root {
  color-scheme: light;

${blocks}
}
${darkBlock}${aliasBlock}`;

await writeFile(OUTPUT_FILE, css, "utf8");

console.log(
  `tokens.lumen.css: ${allTokens.length} tokens, ${darkTokens.length} dark overrides, ${aliases.length} aliases (${TOKENS_URL})`
);

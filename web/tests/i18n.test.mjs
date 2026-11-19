// Fails when a UI string or a look description is missing in a translated language.
// Run with: npm run test:i18n
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const en = read('i18n/locales/en.json');

// Every look id from the recipe sources (one file or a folder of files).
const recipeFiles = [];
const walk = (dir) => {
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, f.name);
    if (f.isDirectory()) walk(p);
    else if (/recipes.*\.ts$/.test(p) || p.includes(join('engine', 'recipes'))) recipeFiles.push(p);
  }
};
walk(join(root, 'engine'));
const ids = new Set();
for (const f of recipeFiles) for (const m of readFileSync(f, 'utf8').matchAll(/\{ id: '([^']+)'/g)) ids.add(m[1]);

// Portuguese must cover every look. The other languages cover the UI and the original catalog.
const FULL_LOOKS = ['pt'];
const LANGS = ['pt', 'es', 'zh', 'hi', 'de'];
const CORE_LOOKS = read('i18n/locales/de.json').looks;

let failures = 0;
const fail = (msg) => { failures++; console.error('FAIL ' + msg); };

if (ids.size < 85) fail(`only ${ids.size} looks found in recipe files`);
for (const lang of LANGS) {
  const b = read(`i18n/locales/${lang}.json`);
  for (const k of Object.keys(en)) {
    if (typeof b.ui[k] !== 'string' || !b.ui[k].trim()) fail(`${lang}: missing UI key "${k}"`);
  }
  for (const k of Object.keys(b.ui)) if (!(k in en)) fail(`${lang}: unknown UI key "${k}"`);
  const need = FULL_LOOKS.includes(lang) ? [...ids] : Object.keys(CORE_LOOKS);
  for (const id of need) if (typeof b.looks[id] !== 'string' || !b.looks[id].trim()) fail(`${lang}: missing look description "${id}"`);
  for (const id of Object.keys(b.looks)) if (!ids.has(id)) fail(`${lang}: description for unknown look "${id}"`);
  // Placeholders must survive translation.
  for (const k of Object.keys(en)) if (en[k].includes('{x}') && b.ui[k] && !b.ui[k].includes('{x}')) fail(`${lang}: "${k}" lost the {x} placeholder`);
}

if (failures) { console.error(`\n${failures} i18n problem(s)`); process.exit(1); }
console.log(`i18n OK: ${Object.keys(en).length} UI keys, ${ids.size} looks, languages ${LANGS.join(', ')}`);

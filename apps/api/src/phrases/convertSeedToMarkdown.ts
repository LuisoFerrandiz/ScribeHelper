import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as XLSX from 'xlsx';
import { convertToMarkdown } from '../resources/convert.js';

// SPEC-005 RF-003: the phrase seed source (apps/api/seed/preferred-
// standard-wording.xlsx, D-022) gets converted to Markdown once and
// read from there on every later seed — faster than re-parsing the
// .xlsx on every container start. The .xlsx itself is never touched;
// it stays in the repo as the read-only original.
const SEED_XLSX = path.join(import.meta.dirname, '..', '..', 'seed', 'preferred-standard-wording.xlsx');
const SEED_MD = path.join(import.meta.dirname, '..', '..', '..', '..', 'data', 'phrases', 'base', 'preferred-standard-wording.md');

// Same slug rule GitHub uses for its own Markdown heading anchors —
// the index links have to match the "## <sheet name>" headings that
// convertToMarkdown's spreadsheet branch already writes, one per tab.
function slugify(heading: string): string {
  return heading
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

export async function convertSeedToMarkdown(): Promise<string> {
  if (existsSync(SEED_MD)) return readFile(SEED_MD, 'utf-8');

  const buffer = await readFile(SEED_XLSX);
  const { markdown } = await convertToMarkdown(buffer, 'preferred-standard-wording.xlsx');

  // Sheet names, in workbook order, for the index — convertToMarkdown
  // doesn't expose them itself (it only returns the finished Markdown).
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetNames = workbook.SheetNames;

  const index = [
    '# Preferred Standard Wording',
    '',
    'Converted once from `apps/api/seed/preferred-standard-wording.xlsx`' +
      ' (D-022) — the original stays in the repo unchanged; this file is' +
      ' what `seedBasePhrases()` reads from (SPEC-005). One category per' +
      ' spreadsheet tab, used below as the index.',
    '',
    '## Index',
    '',
    ...sheetNames.map((name) => `- [${name}](#${slugify(name)})`),
  ].join('\n');

  const fullMarkdown = `${index}\n\n${markdown}\n`;

  await mkdir(path.dirname(SEED_MD), { recursive: true });
  await writeFile(SEED_MD, fullMarkdown, 'utf-8');

  return fullMarkdown;
}

// Also runnable directly (`tsx src/phrases/convertSeedToMarkdown.ts`),
// e.g. to regenerate the .md by hand without running the full migrate.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  convertSeedToMarkdown().then((md) => {
    console.log(`Wrote ${SEED_MD} (${md.length} chars).`);
  });
}

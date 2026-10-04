export type PhraseBox = 'procedural_matters' | 'facts_found' | 'conclusion' | 'decision';

export interface PhraseRow {
  box: PhraseBox;
  label: string;
  body: string;
}

// Sheet name -> box (D-022), same mapping seedPhrases.ts always used
// against the raw .xlsx — unchanged by the .md conversion (SPEC-005).
export const SIMPLE_SHEETS: Record<string, PhraseBox> = {
  'Procedural Matters': 'procedural_matters',
  Validity: 'conclusion',
  'Protest Conclusions': 'conclusion',
  'Redress Conclusions': 'conclusion',
  Reopenings: 'conclusion',
  'Protest Decisions': 'decision',
  'Redress Decisions': 'decision',
};

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

// `sheet_to_html` writes a cell's soft line breaks as `&#x000d;<br/>`
// pairs (CR entity + an actual `<br/>` tag for the LF half) — turn the
// tag into `\n` *before* stripping tags, or the line break is lost
// entirely; the `&#x000d;` half decodes through the numeric-entity
// pass below, reconstructing the original `\r\n` the old .xlsx-based
// parser saw directly from the cell value.
function stripTags(html: string): string {
  const withBreaks = html.replace(/<br\s*\/?>/gi, '\n');
  const withoutTags = withBreaks.replace(/<[^>]+>/g, '');
  return withoutTags
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, name) => ENTITIES[name])
    .trim();
}

interface Cell {
  text: string;
  colspan: number;
  rowspan: number;
}

function parseRowCells(trContent: string): Cell[] {
  const cells: Cell[] = [];
  for (const match of trContent.matchAll(/<t[dh]([^>]*)>([\s\S]*?)<\/t[dh]>/g)) {
    const attrs = match[1];
    const colspan = Number(/colspan="(\d+)"/.exec(attrs)?.[1] ?? '1');
    const rowspan = Number(/rowspan="(\d+)"/.exec(attrs)?.[1] ?? '1');
    cells.push({ text: stripTags(match[2]), colspan, rowspan });
  }
  return cells;
}

// Rebuilds the first `maxCols` columns of a `sheet_to_html`-generated
// table as a plain grid, one array per row — same shape
// `XLSX.utils.sheet_to_json(sheet, {header: 1})` gave the old,
// .xlsx-reading parser. Only the first two columns ever carry phrase
// data (D-022: "every row is a standalone [label, body] pair"), so
// tracking stops there — a `colspan`/`rowspan` on a later column never
// affects what we read. A `rowspan` leaves a later row's HTML missing
// a `<td>` for that column entirely (the browser-rendering case this
// mirrors); a continuation column is read as empty, matching how
// `sheet_to_json` already left non-top-left merged cells blank, not
// repeated — so this reconstruction keeps the old parser's behavior
// for merged label cells identical.
function htmlTableRows(tableHtml: string, maxCols: number): string[][] {
  const pendingRowspan = Array.from({ length: maxCols }, () => 0);
  const rows: string[][] = [];

  for (const trMatch of tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = parseRowCells(trMatch[1]);
    let cellIndex = 0;
    const row: string[] = [];
    let col = 0;
    while (col < maxCols) {
      if (pendingRowspan[col] > 0) {
        row[col] = '';
        pendingRowspan[col]--;
        col++;
        continue;
      }
      const cell = cells[cellIndex];
      if (!cell) {
        row[col] = '';
        col++;
        continue;
      }
      cellIndex++;
      row[col] = cell.text;
      if (cell.rowspan > 1) pendingRowspan[col] = cell.rowspan - 1;
      for (let c = col + 1; c < Math.min(col + cell.colspan, maxCols); c++) {
        row[c] = '';
        if (cell.rowspan > 1) pendingRowspan[c] = cell.rowspan - 1;
      }
      col += cell.colspan;
    }
    rows.push(row.slice(0, maxCols));
  }

  return rows;
}

// Splits the seed .md (one `## <sheet name>` section per tab,
// `convertSeedToMarkdown.ts`) back into per-sheet HTML, in the same
// shape `workbook.Sheets[name]` used to hand to the old parser.
function splitSheets(markdown: string): Record<string, string> {
  const sheets: Record<string, string> = {};
  const headers = [...markdown.matchAll(/^## (.+)$/gm)];
  for (let i = 0; i < headers.length; i++) {
    const name = headers[i][1].trim();
    const start = headers[i].index! + headers[i][0].length;
    const end = i + 1 < headers.length ? headers[i + 1].index! : markdown.length;
    sheets[name] = markdown.slice(start, end);
  }
  return sheets;
}

function cell(row: string[], i: number): string {
  return (row[i] ?? '').trim();
}

function parseSimpleSheet(tableHtml: string, box: PhraseBox): PhraseRow[] {
  const rows = htmlTableRows(tableHtml, 2);
  const out: PhraseRow[] = [];
  for (const row of rows.slice(2)) {
    const label = cell(row, 0);
    const body = cell(row, 1);
    if (!body) continue;
    out.push({ box, label, body });
  }
  return out;
}

// "NO Hearing" sheet groups four lines under one label: Suggested Fact,
// Conclusion, Decision Short, Decision — split across three boxes.
function parseNoHearingSheet(tableHtml: string): PhraseRow[] {
  const rows = htmlTableRows(tableHtml, 2);
  const out: PhraseRow[] = [];
  let groupLabel = '';
  for (const row of rows.slice(1)) {
    const col0 = cell(row, 0);
    const col1 = cell(row, 1);
    if (col0) groupLabel = col0;
    if (!col1) continue;

    const strip = (prefix: string) => col1.slice(prefix.length).trim();
    if (col1.startsWith('Suggested Fact:')) {
      out.push({ box: 'facts_found', label: groupLabel, body: strip('Suggested Fact:') });
    } else if (col1.startsWith('Conclusion:')) {
      out.push({ box: 'conclusion', label: groupLabel, body: strip('Conclusion:') });
    } else if (col1.startsWith('Decision Short:')) {
      out.push({ box: 'decision', label: `${groupLabel} (short)`, body: strip('Decision Short:') });
    } else if (col1.startsWith('Decision:')) {
      out.push({ box: 'decision', label: groupLabel, body: strip('Decision:') });
    }
  }
  return out;
}

// Replaces reading `XLSX.WorkSheet` objects directly — same mapping,
// same row-skipping, same "NO Hearing" grouping as the original
// .xlsx-based parser, now reading the converted .md (SPEC-005 RF-003).
export function parseSeedMarkdown(markdown: string): PhraseRow[] {
  const sheets = splitSheets(markdown);
  const rows: PhraseRow[] = [];

  for (const [sheetName, box] of Object.entries(SIMPLE_SHEETS)) {
    const html = sheets[sheetName];
    if (!html) continue;
    rows.push(...parseSimpleSheet(html, box));
  }

  const noHearing = sheets['NO Hearing'];
  if (noHearing) rows.push(...parseNoHearingSheet(noHearing));

  return rows;
}

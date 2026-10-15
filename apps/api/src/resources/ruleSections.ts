import { canonicalNumber } from '../rules/citation.js';

// SPEC-022 RF-002: split a converted rule document into numbered sections.
// Pure function, no database. Three header styles: tab (RRS), space (NoR/SI) and,
// since SPEC-033, letter-dot-number (class rules: `A.1 LANGUAGE`, `C.1.1 RULES`).

// Bump when the parser changes what it indexes: the server reindexes every accepted
// rule document once at startup when the stored version is lower (SPEC-033 RF-012).
export const RULE_PARSER_VERSION = 2;

export interface RuleSectionDraft {
  number: string; // canonical
  heading: string;
  body: string; // heading line + text up to the next section or part header
  part: string | null; // 'Appendix B' | 'Addendum E' | null (main body)
  position: number;
}

const TAB_HEADER = /^([A-Z]{0,2}\d+(?:\.\d+)*)[  ]*\t+\s*(\S.*)$/;
const SPACE_HEADER = /^(\d+(?:\.\d+)*)(\.?)\s+(\S.*)$/;
// SPEC-033 RF-009: the dot after the letters is required, so it never clashes with
// the tab style of the RRS (`A2`, no dot).
const LETTER_HEADER = /^([A-Z]{1,2}\.\d+(?:\.\d+)*)\.?\s+(\S.*)$/;
// SPEC-033 RF-010: an index line ends in leader dots (or an ellipsis) and a page number.
const INDEX_LINE = /(?:\.{3,}|(?:\.\s){3,}\.?|…+)\s*\d+\s*$/;
const PART_APPENDIX = /^(?:APPENDIX|Appendix)\s+([A-Z]\d?)$/;
const PART_ADDENDUM = /^(?:Sailing Instruction|Notice of Race)\s+Addendum\s+([A-Z]\d?)$/;
const MONTH = /^(?:January|February|March|April|May|June|July|August|September|October|November|December)\b/;
const PAGE_FOOTER = /^\d+ of \d+/;
const HEADING_MAX = 160;

interface Header {
  number: string;
  heading: string;
}

function tabHeader(line: string): Header | null {
  const m = TAB_HEADER.exec(line);
  if (!m) return null;
  if (m[1] === '0' || PAGE_FOOTER.test(line) || MONTH.test(line)) return null;
  return { number: canonicalNumber(m[1]), heading: m[2].trim() };
}

function spaceHeader(line: string): Header | null {
  const m = SPACE_HEADER.exec(line);
  if (!m) return null;
  const [, num, dot, rest] = m;
  if (num === '0' || PAGE_FOOTER.test(line) || MONTH.test(rest)) return null;
  const levels = num.split('.').length;
  if (levels === 1) {
    // `1. RULES`: needs the dot, <= 99, and a capital / bracket / quote first.
    if (!dot || Number(num) > 99) return null;
    if (!/^[A-Z[(“"‘]/.test(rest)) return null;
  }
  return { number: num, heading: rest.trim() };
}

function letterHeader(line: string): Header | null {
  const m = LETTER_HEADER.exec(line);
  if (!m) return null;
  if (INDEX_LINE.test(line)) return null;
  return { number: canonicalNumber(m[1]), heading: m[2].trim() };
}

// Index lines the converted PDF leaves without leader dots, so they would take the
// number of the real section (first occurrence wins): a header that ends in a bare
// page number (`E.1 Keel and Rudder Specifications 17`) or whose next line is the
// wrapped tail of an entry (`World Sailing Building Plaque . 5`).
const TRAILING_PAGE = /[^.:;,\d]\s+\d{1,3}$/;
const WRAPPED_INDEX_TAIL = /\s\.+\s*\d{1,3}\s*$/;
function looksLikeIndexEntry(lines: string[], i: number): boolean {
  const line = lines[i].trim();
  return TRAILING_PAGE.test(line) || WRAPPED_INDEX_TAIL.test((lines[i + 1] ?? '').trim());
}

function partHeader(line: string): string | null {
  const t = line.trim();
  const a = PART_APPENDIX.exec(t);
  if (a) return `Appendix ${a[1]}`;
  const d = PART_ADDENDUM.exec(t);
  if (d) return `Addendum ${d[1]}`;
  return null;
}

// Style choice (SPEC-033 RF-009): the letter style wins only with strictly more
// headers than both others; otherwise the previous rule (space > tab ? space : tab),
// so the RRS, NoR and SI are indexed exactly as before.
function chooseHeader(lines: string[]): (line: string) => Header | null {
  let tabCount = 0;
  let spaceCount = 0;
  let letterCount = 0;
  for (const l of lines) {
    if (tabHeader(l)) tabCount++;
    if (spaceHeader(l)) spaceCount++;
    if (letterHeader(l)) letterCount++;
  }
  if (letterCount > tabCount && letterCount > spaceCount) return letterHeader;
  return spaceCount > tabCount ? spaceHeader : tabHeader;
}

export function parseRuleSections(markdown: string): RuleSectionDraft[] {
  const lines = markdown.split(/\r?\n/);
  const header = chooseHeader(lines);

  const out: RuleSectionDraft[] = [];
  const seen = new Set<string>();
  let part: string | null = null;
  let current: { draft: RuleSectionDraft; lines: string[] } | null = null;

  const close = () => {
    if (current) {
      current.draft.body = current.lines.join('\n').trim();
      out.push(current.draft);
      current = null;
    }
  };

  const letterStyle = header === letterHeader;
  for (const [i, line] of lines.entries()) {
    const p = partHeader(line);
    if (p) {
      close();
      part = p;
      continue;
    }
    const h = letterStyle && looksLikeIndexEntry(lines, i) ? null : header(line);
    if (h) {
      const key = `${part ?? ''}|${h.number}`;
      if (!seen.has(key)) {
        seen.add(key);
        close();
        current = {
          draft: {
            number: h.number,
            heading: h.heading.slice(0, HEADING_MAX),
            body: '',
            part,
            position: out.length,
          },
          lines: [line],
        };
        continue;
      }
    }
    if (current) current.lines.push(line);
  }
  close();
  return out;
}

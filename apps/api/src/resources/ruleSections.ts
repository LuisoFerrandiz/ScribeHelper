import { canonicalNumber } from '../rules/citation.js';

// SPEC-022 RF-002: split a converted rule document into numbered sections.
// Pure function, no database. Two header styles: tab (RRS) and space (NoR/SI).

export interface RuleSectionDraft {
  number: string; // canonical
  heading: string;
  body: string; // heading line + text up to the next section or part header
  part: string | null; // 'Appendix B' | 'Addendum E' | null (main body)
  position: number;
}

const TAB_HEADER = /^([A-Z]{0,2}\d+(?:\.\d+)*)[  ]*\t+\s*(\S.*)$/;
const SPACE_HEADER = /^(\d+(?:\.\d+)*)(\.?)\s+(\S.*)$/;
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

function partHeader(line: string): string | null {
  const t = line.trim();
  const a = PART_APPENDIX.exec(t);
  if (a) return `Appendix ${a[1]}`;
  const d = PART_ADDENDUM.exec(t);
  if (d) return `Addendum ${d[1]}`;
  return null;
}

export function parseRuleSections(markdown: string): RuleSectionDraft[] {
  const lines = markdown.split(/\r?\n/);

  let tabCount = 0;
  let spaceCount = 0;
  for (const l of lines) {
    if (tabHeader(l)) tabCount++;
    if (spaceHeader(l)) spaceCount++;
  }
  const header = spaceCount > tabCount ? spaceHeader : tabHeader;

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

  for (const line of lines) {
    const p = partHeader(line);
    if (p) {
      close();
      part = p;
      continue;
    }
    const h = header(line);
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

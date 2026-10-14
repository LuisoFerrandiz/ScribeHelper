import { db } from '../db/connection.js';
import { formatCitation, parseCitation } from './citation.js';
import { ELIGIBLE_SQL, SECTION_COLUMNS, prefixOf, sectionsForCitation } from './sectionQuery.js';
import type { SectionRow } from './sectionQuery.js';

// SPEC-027: rule candidates from the Facts Found text. Deterministic keyword
// match over the rule_section index (no AI, no network); the drafter decides
// which rules apply and adds them with the validated Add of SPEC-022.

export const MAX_FACTS_CHARS = 8000;
export const MAX_SUGGESTIONS = 8;
const MAX_TERMS = 30;
const CANDIDATES = 50;

// Function words plus the sailing vocabulary that is in nearly every rule.
const STOP = new Set(
  (
    'a an and are as at be been but by did do does for from had has have he her his if in into is it its not of on or she that the their them then there they this to was were when which while with would after before during about over under than also both each other one two ' +
    'boat boats race rule rules sailing sailed rrs'
  ).split(' '),
);

// Facts are written in the past tense and rules in the present, and the FTS
// index has no stemming: strip a plain suffix and search the stem as a prefix.
function stem(w: string): string {
  for (const suf of ['ing', 'ed', 'es', 's']) {
    if (w.endsWith(suf) && w.length - suf.length >= 4) return w.slice(0, -suf.length);
  }
  return w;
}

export function suggestTerms(text: string): string[] {
  const words = text.toLowerCase().match(/[a-z]{3,}/g) ?? [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const w of words) {
    if (STOP.has(w)) continue;
    const s = stem(w);
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= MAX_TERMS) break;
  }
  return out;
}

// "RRS 18.2", "rule 14", "NoR 1.9", "SI 12", "CR C6.1": prefix in capitals
// (except Rule / rule), no final dot. A bare number is not a reference here.
const EXPLICIT_REF = /\b(?:RRS|CR|NoR|SI|[Rr]ule)\s+[A-Z]?\d+(?:\.\d+)*(?:\([A-Za-z0-9]+\))*/g;

export function explicitRefs(text: string): string[] {
  return text.match(EXPLICIT_REF) ?? [];
}

function isAppendixPart(s: SectionRow): boolean {
  return !!s.part && s.part.startsWith('Appendix');
}

export function suggestSections(rawText: string, eventId: number | null): SectionRow[] {
  const text = rawText.slice(0, MAX_FACTS_CHARS);
  const out: SectionRow[] = [];
  const seen = new Set<number>();
  const add = (s: SectionRow) => {
    if (seen.has(s.id) || out.length >= MAX_SUGGESTIONS) return;
    seen.add(s.id);
    out.push(s);
  };

  // 1. Rules named in the text, in text order.
  for (const ref of explicitRefs(text)) {
    const parsed = parseCitation(ref);
    if (!parsed || !parsed.prefix) continue;
    sectionsForCitation(parsed, eventId)
      .slice(0, 2)
      .forEach(add);
  }

  // 2. Keyword match, best first.
  const terms = suggestTerms(text);
  if (terms.length === 0) return out;
  const match = terms.map((t) => `"${t}"*`).join(' OR ');
  let rows: SectionRow[] = [];
  try {
    rows = db
      .prepare(
        `SELECT ${SECTION_COLUMNS}
         FROM rule_section_fts
         JOIN rule_section s ON s.id = rule_section_fts.section_id
         JOIN resource r ON r.id = s.resource_id
         WHERE rule_section_fts MATCH ? AND ${ELIGIBLE_SQL}
         ORDER BY bm25(rule_section_fts, 5.0, 1.0)
         LIMIT ?`,
      )
      .all(match, eventId, CANDIDATES) as unknown as SectionRow[];
  } catch {
    // A query FTS5 still rejects yields no keyword hits, not a 500.
    return out;
  }

  // Appendix variants of the RRS / class go after the main-body rules, and are
  // dropped when the main rule with the same number is among the candidates.
  const key = (s: SectionRow) => `${prefixOf(s)}|${s.number}`;
  const mainKeys = new Set(rows.filter((s) => !isAppendixPart(s)).map(key));
  rows.filter((s) => !isAppendixPart(s)).forEach(add);
  rows.filter((s) => isAppendixPart(s) && !mainKeys.has(key(s))).forEach(add);
  return out;
}

// SPEC-028: references typed in the text that match no eligible section.
// Unique by canonical form, in order of appearance, shown as first written.
// Years ("RRS 2021") and text parseCitation does not understand are ignored.
export function unresolvedRefs(rawText: string, eventId: number | null): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const ref of explicitRefs(rawText.slice(0, MAX_FACTS_CHARS))) {
    const parsed = parseCitation(ref);
    if (!parsed || !parsed.prefix) continue;
    if (/^\d{4,}$/.test(parsed.number)) continue;
    const canonical = formatCitation({ prefix: parsed.prefix, part: parsed.part, number: parsed.number });
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    if (sectionsForCitation(parsed, eventId).length === 0) out.push(ref.replace(/\s+/g, ' '));
  }
  return out;
}

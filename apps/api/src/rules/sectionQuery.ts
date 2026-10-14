import { db } from '../db/connection.js';
import { citationFor, formatCitation, parseCitation, prefixFor } from './citation.js';
import type { CitationPrefix, DocType, ParsedCitation } from './citation.js';
import type { RuleLayer } from '../resources/storage.js';

// SPEC-022: queries over rule_section shared by the search route, the validated
// citation add and the draft validator. The only place that decides which
// sections a case may cite (D-004): accepted rule documents, and event-layer
// ones only for the case's own event.

export interface SectionRow {
  id: number;
  resource_id: number;
  number: string;
  heading: string;
  body: string;
  part: string | null;
  layer: RuleLayer;
  doc_type: DocType | null;
  doc_title: string;
  resource_created_at: string;
}

export const SECTION_COLUMNS = `s.id, s.resource_id, s.number, s.heading, s.body, s.part,
  r.layer, r.doc_type, r.title AS doc_title, r.created_at AS resource_created_at`;

const SECTION_SELECT = `
  SELECT ${SECTION_COLUMNS}
  FROM rule_section s
  JOIN resource r ON r.id = s.resource_id`;

// Eligibility: accepted rules; layer 'event' only when it belongs to the case's event.
// One bind parameter: the case's event id (NULL = no event rules).
export const ELIGIBLE_SQL = `r.kind = 'rule' AND r.status = 'accepted'
  AND (r.layer IN ('rrs', 'class') OR (r.layer = 'event' AND r.event_id = ?))`;

export function eventIdOfCase(caseId: number | null): number | null {
  if (!caseId) return null;
  const row = db.prepare('SELECT event_id FROM protest_case WHERE id = ?').get(caseId) as
    | { event_id: number }
    | undefined;
  return row ? row.event_id : null;
}

export function prefixOf(s: Pick<SectionRow, 'layer' | 'doc_type'>): CitationPrefix | null {
  return prefixFor(s.layer, s.doc_type);
}

export function citationOfSection(s: SectionRow): string | null {
  const prefix = prefixOf(s);
  return prefix ? citationFor({ prefix, number: s.number, part: s.part }) : null;
}

export function sectionById(id: number, eventId: number | null): SectionRow | null {
  const row = db.prepare(`${SECTION_SELECT} WHERE s.id = ? AND ${ELIGIBLE_SQL}`).get(id, eventId) as
    | SectionRow
    | undefined;
  return row ?? null;
}

// Sections a parsed citation resolves to (same prefix, same eligible event).
// A part typed in full ("RRS Appendix A A2.1") also matches its native short form.
// Newest document first.
export function sectionsForCitation(c: ParsedCitation, eventId: number | null): SectionRow[] {
  if (!c.prefix) return [];
  const rows = db
    .prepare(`${SECTION_SELECT} WHERE s.number = ? AND ${ELIGIBLE_SQL} ORDER BY r.created_at DESC, s.id`)
    .all(c.number, eventId) as unknown as SectionRow[];
  const wanted = formatCitation({ prefix: c.prefix, part: c.part, number: c.number });
  return rows.filter(
    (s) => prefixOf(s) === c.prefix && (citationOfSection(s) === wanted || (c.part !== null && c.part === s.part)),
  );
}

// Stored rule_reference text -> canonical text, for duplicate checks (RF-008).
// Old references without a prefix ("Rule 44", "44") count as RRS. Text that is
// not shaped like a citation compares as itself, lower-cased.
export function normalizeStoredReference(text: string): string {
  const c = parseCitation(text);
  if (!c) return text.trim().toLowerCase();
  return formatCitation({ prefix: c.prefix ?? 'RRS', part: c.part, number: c.number, suffix: c.suffix });
}

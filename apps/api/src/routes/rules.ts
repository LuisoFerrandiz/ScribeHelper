import type { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';
import { parseCitation } from '../rules/citation.js';
import { suggestSections } from '../rules/factsQuery.js';
import {
  ELIGIBLE_SQL,
  SECTION_COLUMNS,
  citationOfSection,
  eventIdOfCase,
  normalizeStoredReference,
  prefixOf,
  sectionsForCitation,
} from '../rules/sectionQuery.js';
import type { SectionRow } from '../rules/sectionQuery.js';

const MAX_HITS = 25;
const MAX_EXACT = 10;
const MAX_QUERY_CHARS = 200;
const MAX_TERMS = 8;
const SNIPPET_CHARS = 240;

// SPEC-022 RF-004: search the corpus by rule. `q` may be a citation / number
// ("44.2", "RRS 44", "NoR 1.9", "C6.1") or words ("propulsion").
export function registerRuleSearchRoute(app: FastifyInstance) {
  app.get('/rules/search', (req) => {
    const { q: rawQ, case_id } = req.query as { q?: string; case_id?: string };
    const q = (rawQ ?? '').trim().slice(0, MAX_QUERY_CHARS);
    const caseId = case_id ? Number(case_id) : null;
    const eventId = eventIdOfCase(caseId);
    if (!q) return { hits: [], otherEvents: false };

    const cited = citedSet(caseId);

    const hits: ReturnType<typeof toHit>[] = [];
    const seen = new Set<number>();
    const push = (s: SectionRow, snippet: string) => {
      if (seen.has(s.id) || hits.length >= MAX_HITS) return;
      seen.add(s.id);
      hits.push(toHit(s, snippet, cited));
    };

    // 1. Exact number / citation.
    const parsed = parseCitation(q);
    if (parsed) {
      const exact = parsed.prefix
        ? sectionsForCitation(parsed, eventId)
        : (db
            .prepare(
              `SELECT ${SECTION_COLUMNS}
               FROM rule_section s JOIN resource r ON r.id = s.resource_id
               WHERE s.number = ? AND ${ELIGIBLE_SQL}
               ORDER BY s.part IS NOT NULL, r.layer, s.id`,
            )
            .all(parsed.number, eventId) as unknown as SectionRow[]);
      exact.slice(0, MAX_EXACT).forEach((s) => push(s, s.heading));
    }

    // 2. Full text. Every term is quoted so punctuation and FTS operators
    // (", AND, NEAR(, *) can never reach MATCH as syntax.
    const terms = q
      .split(/\s+/)
      .map((t) => t.replace(/"/g, ''))
      .filter(Boolean)
      .slice(0, MAX_TERMS);
    if (terms.length) {
      const match = terms.map((t) => `"${t}"`).join(' ');
      try {
        const rows = db
          .prepare(
            `SELECT ${SECTION_COLUMNS},
                    snippet(rule_section_fts, 1, '[', ']', '...', 24) AS snippet
             FROM rule_section_fts
             JOIN rule_section s ON s.id = rule_section_fts.section_id
             JOIN resource r ON r.id = s.resource_id
             WHERE rule_section_fts MATCH ? AND ${ELIGIBLE_SQL}
             ORDER BY rank
             LIMIT ?`,
          )
          .all(match, eventId, MAX_HITS * 2) as unknown as (SectionRow & { snippet: string })[];
        for (const r of rows) push(r, r.snippet);
      } catch {
        // A query FTS5 still rejects yields no full-text hits, not a 500.
      }
    }

    // Hint for an empty result: event rules are only shown for the case's own event.
    const otherEvents =
      hits.length === 0 &&
      !!db
        .prepare(
          `SELECT 1 FROM resource WHERE kind = 'rule' AND status = 'accepted' AND layer = 'event'
           AND (? IS NULL OR event_id != ?) LIMIT 1`,
        )
        .get(eventId, eventId);
    return { hits, otherEvents };
  });

  // SPEC-027: rule candidates from the Facts Found text on screen (saved or not).
  app.post('/rules/suggest', (req, reply) => {
    const body = (req.body ?? {}) as { case_id?: unknown; text?: unknown };
    if (typeof body.text !== 'string') return reply.code(400).send({ error: 'text must be a string' });
    const caseId = typeof body.case_id === 'number' && Number.isInteger(body.case_id) ? body.case_id : null;
    const cited = citedSet(caseId);
    const hits = suggestSections(body.text, eventIdOfCase(caseId)).map((s) =>
      toHit(s, s.heading, cited),
    );
    return { hits, otherEvents: false };
  });
}

// Canonical citations already registered for the case.
function citedSet(caseId: number | null): Set<string> {
  const cited = new Set<string>();
  if (!caseId) return cited;
  const rows = db.prepare('SELECT rule_reference FROM case_rule_citation WHERE case_id = ?').all(caseId) as {
    rule_reference: string;
  }[];
  for (const r of rows) cited.add(normalizeStoredReference(r.rule_reference));
  return cited;
}

function toHit(s: SectionRow, snippet: string, cited: Set<string>) {
  const citation = citationOfSection(s);
  return {
    section_id: s.id,
    citation, // null: event document not classified yet (no prefix)
    heading: s.heading,
    snippet: snippet.length > SNIPPET_CHARS ? `${snippet.slice(0, SNIPPET_CHARS)}...` : snippet,
    layer: s.layer,
    doc_type: s.doc_type,
    part: s.part,
    doc_title: s.doc_title,
    cited: citation ? cited.has(citation) : false,
    can_add: prefixOf(s) !== null,
  };
}

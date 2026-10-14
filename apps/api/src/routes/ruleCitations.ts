import type { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';
import { formatCitation, parseCitation } from '../rules/citation.js';
import {
  citationOfSection,
  eventIdOfCase,
  normalizeStoredReference,
  sectionById,
  sectionsForCitation,
} from '../rules/sectionQuery.js';
import type { SectionRow } from '../rules/sectionQuery.js';

const UNCLASSIFIED = 'Classify this document first (Upload rules)';

// SPEC-022 RF-006..RF-009 (D-034): the only way a citation is created. The
// server decides what may be cited (D-004): a rule of an accepted document of
// the corpus, and for NoR / SI only one of the case's own event.
export function registerRuleCitationRoutes(app: FastifyInstance) {
  app.post('/rule-citations', (req, reply) => {
    const body = (req.body ?? {}) as { case_id?: unknown; text?: unknown; section_id?: unknown };
    const caseId = Number(body.case_id);
    if (!Number.isInteger(caseId) || caseId <= 0) return reply.code(400).send({ error: 'case_id is required' });
    if (!db.prepare('SELECT 1 FROM protest_case WHERE id = ?').get(caseId)) {
      return reply.code(404).send({ error: 'case not found' });
    }
    const eventId = eventIdOfCase(caseId);

    let canonical: string;
    if (body.section_id !== undefined) {
      // The "Add" button: the server re-checks the section belongs to this case's corpus.
      const section = sectionById(Number(body.section_id), eventId);
      if (!section) return reply.code(422).send({ error: 'Not found in the loaded rules' });
      const citation = citationOfSection(section);
      if (!citation) return reply.code(422).send({ error: UNCLASSIFIED });
      canonical = citation;
    } else if (typeof body.text === 'string' && body.text.trim()) {
      const text = body.text.trim();
      const parsed = parseCitation(text);
      if (!parsed) return reply.code(422).send({ error: `Not found in the loaded rules: ${text}` });

      let matches: SectionRow[];
      if (parsed.prefix) {
        matches = sectionsForCitation(parsed, eventId);
      } else {
        // RF-007: no prefix means RRS, but only when that number exists in the RRS main text.
        const wanted = formatCitation({ prefix: 'RRS', part: null, number: parsed.number });
        matches = sectionsForCitation({ ...parsed, prefix: 'RRS' }, eventId).filter(
          (s) => citationOfSection(s) === wanted,
        );
        if (matches.length === 0) {
          return reply.code(422).send({ error: 'Specify the document: RRS, CR, NoR or SI' });
        }
      }
      if (parsed.suffix) {
        const suffix = parsed.suffix;
        matches = matches.filter((s) => s.body.toLowerCase().includes(suffix));
      }
      if (matches.length === 0) {
        const shown = formatCitation({ ...parsed, prefix: parsed.prefix ?? 'RRS' });
        return reply.code(422).send({ error: `Not found in the loaded rules: ${shown}` });
      }
      canonical = (citationOfSection(matches[0]) as string) + (parsed.suffix ?? '');
    } else {
      return reply.code(400).send({ error: 'text or section_id is required' });
    }

    // RF-008: same citation, compared in canonical form (old "Rule 44" counts as "RRS 44").
    const existing = db.prepare('SELECT rule_reference FROM case_rule_citation WHERE case_id = ?').all(caseId) as {
      rule_reference: string;
    }[];
    if (existing.some((r) => normalizeStoredReference(r.rule_reference) === normalizeStoredReference(canonical))) {
      return reply.code(422).send({ error: 'Already cited' });
    }

    const next = db
      .prepare('SELECT COALESCE(MAX(position), -1) + 1 AS next FROM case_rule_citation WHERE case_id = ?')
      .get(caseId) as { next: number };
    const result = db
      .prepare('INSERT INTO case_rule_citation (case_id, rule_reference, position) VALUES (?, ?, ?)')
      .run(caseId, canonical, next.next);
    const row = db.prepare('SELECT * FROM case_rule_citation WHERE id = ?').get(result.lastInsertRowid);
    reply.code(201).send(row);
  });
}

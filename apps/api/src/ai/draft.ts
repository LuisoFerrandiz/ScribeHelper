import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db/connection.js';
import { readMarkdown } from '../resources/storage.js';

export type DraftBox = 'procedural_matters' | 'facts_found' | 'conclusion' | 'decision';

interface CaseRow {
  id: number;
  case_number: string;
  case_type: 'protest' | 'redress';
  day: string | null;
  race: string | null;
  informed_at: string | null;
  procedural_matters: string;
  facts_found: string;
  conclusion: string;
  decision: string;
}

export interface CitationCheck {
  reference: string;
  found: boolean;
}

export interface DraftResult {
  text: string;
  citations: CitationCheck[];
}

const BOX_LABEL: Record<DraftBox, string> = {
  procedural_matters: 'Procedural Matters',
  facts_found: 'Facts Found',
  conclusion: 'Conclusion',
  decision: 'Decision',
};

// Phase 4 (CONTEXT.md section 9): alternative draft panel with citation
// validation. First phase allowed to call an external AI / network
// (RULES.md R-23 exception, R-34 — this comes last, after every
// offline-capable phase). One box at a time, grounded only in this
// case's own saved data and the rules the user has already cited —
// the model is told not to invent facts or cite anything else.
export async function generateDraft(caseId: number, box: DraftBox): Promise<DraftResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured on the server');

  const caseRow = db.prepare('SELECT * FROM protest_case WHERE id = ?').get(caseId) as CaseRow | undefined;
  if (!caseRow) throw new Error('case not found');

  const parties = db
    .prepare(
      `SELECT party.role, boat.sail_number, boat.boat_name
       FROM party LEFT JOIN boat ON boat.id = party.boat_id
       WHERE party.case_id = ?`,
    )
    .all(caseId) as { role: string; sail_number: string | null; boat_name: string | null }[];

  const witnesses = db
    .prepare(
      `SELECT person.full_name, witness.role
       FROM witness JOIN person ON person.id = witness.person_id
       WHERE witness.case_id = ?`,
    )
    .all(caseId) as { full_name: string; role: string | null }[];

  const ruleCitations = db
    .prepare('SELECT rule_reference FROM case_rule_citation WHERE case_id = ? ORDER BY position')
    .all(caseId) as { rule_reference: string }[];

  const prompt = buildPrompt(box, caseRow, parties, witnesses, ruleCitations);

  const anthropic = new Anthropic({ apiKey });
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 1024,
    system:
      'You draft one section of a World Sailing race protest committee decision. ' +
      'Formal, neutral, third person. Use only the facts given to you — never invent ' +
      'a boat, person, rule, or event you were not told about. Only cite rules that ' +
      'appear in the "Rules already cited for this case" list; if none apply, cite none. ' +
      'Return only the drafted section text, no heading, no preamble.',
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  const citations = await validateCitations(extractCitations(text));
  return { text, citations };
}

function buildPrompt(
  box: DraftBox,
  caseRow: CaseRow,
  parties: { role: string; sail_number: string | null; boat_name: string | null }[],
  witnesses: { full_name: string; role: string | null }[],
  ruleCitations: { rule_reference: string }[],
): string {
  const lines: string[] = [];
  lines.push(`Draft the "${BOX_LABEL[box]}" section of the decision.`);
  lines.push('');
  lines.push(`Case ${caseRow.case_number} — ${caseRow.case_type}`);
  if (caseRow.day) lines.push(`Day: ${caseRow.day}`);
  if (caseRow.race) lines.push(`Race: ${caseRow.race}`);
  if (caseRow.informed_at) lines.push(`Informed at: ${caseRow.informed_at}`);

  if (parties.length > 0) {
    lines.push('');
    lines.push('Parties:');
    for (const p of parties) {
      lines.push(`- ${p.role}: ${p.sail_number ?? '(no sail number)'} ${p.boat_name ?? ''}`.trim());
    }
  }

  if (box === 'procedural_matters' && witnesses.length > 0) {
    lines.push('');
    lines.push('Witnesses heard:');
    for (const w of witnesses) lines.push(`- ${w.full_name}${w.role ? ` (${w.role})` : ''}`);
  }

  if (box === 'facts_found' && caseRow.procedural_matters.trim()) {
    lines.push('');
    lines.push('Procedural Matters (already written):');
    lines.push(caseRow.procedural_matters.trim());
  }

  if (box === 'conclusion' && caseRow.facts_found.trim()) {
    lines.push('');
    lines.push('Facts Found (already written):');
    lines.push(caseRow.facts_found.trim());
  }

  if (box === 'decision' && caseRow.conclusion.trim()) {
    lines.push('');
    lines.push('Conclusion (already written):');
    lines.push(caseRow.conclusion.trim());
  }

  if (ruleCitations.length > 0) {
    lines.push('');
    lines.push('Rules already cited for this case (cite only from this list):');
    for (const r of ruleCitations) lines.push(`- ${r.rule_reference}`);
  } else {
    lines.push('');
    lines.push('No rules have been cited for this case yet — cite none.');
  }

  const currentText = caseRow[box].trim();
  if (currentText) {
    lines.push('');
    lines.push(`Current draft of ${BOX_LABEL[box]} (revise/improve it, keep the same facts):`);
    lines.push(currentText);
  }

  return lines.join('\n');
}

// Matches "RRS 42.1(a)", "rule 18.2", "Rule C2.1", etc. Deliberately
// requires the keyword so ordinary numbers (race numbers, dates) never
// get treated as a citation.
const CITATION_PATTERN = /\b(?:RRS|Rule)\s+([A-Z]?\d+(?:\.\d+)*(?:\([a-z]\))?)/gi;

export function extractCitations(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(CITATION_PATTERN)) {
    found.add(match[1]);
  }
  return [...found];
}

// Checks each citation against the accepted rule corpus (D-020) — a rule
// the AI mentions must actually appear in an uploaded, accepted rule
// document, or it is flagged for the drafter to double-check. Plain
// substring match on the converted markdown, not FTS5 MATCH: a rule
// reference like "42.1(a)" has punctuation FTS5's tokenizer splits on,
// so a phrase MATCH query would misbehave (same class of gotcha as
// D-023's UNINDEXED-column bug).
export async function validateCitations(references: string[]): Promise<CitationCheck[]> {
  if (references.length === 0) return [];

  const acceptedRules = db
    .prepare(`SELECT markdown_path FROM resource WHERE kind = 'rule' AND status = 'accepted'`)
    .all() as { markdown_path: string | null }[];

  const bodies = await Promise.all(
    acceptedRules.map((r) => (r.markdown_path ? readMarkdown(r.markdown_path) : Promise.resolve(''))),
  );
  const corpus = bodies.join('\n').toLowerCase();

  return references.map((reference) => ({
    reference,
    found: corpus.includes(reference.toLowerCase()),
  }));
}

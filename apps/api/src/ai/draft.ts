import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db/connection.js';
import { formatCitation, parseCitation } from '../rules/citation.js';
import type { ParsedCitation } from '../rules/citation.js';
import { eventIdOfCase, sectionsForCitation } from '../rules/sectionQuery.js';

export type DraftBox = 'procedural_matters' | 'facts_found' | 'conclusion' | 'decision';

interface CaseRow {
  id: number;
  case_number: string;
  event_id: number;
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
export async function generateDraft(caseId: number, box: DraftBox, currentBoxText: string): Promise<DraftResult> {
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

  const eventId = caseRow.event_id;
  const ruleExcerpts = ruleCitations.map((r) => ({
    reference: r.rule_reference,
    excerpt: findExcerpt(r.rule_reference, eventId),
  }));

  const prompt = buildPrompt(box, caseRow, parties, witnesses, ruleExcerpts, currentBoxText);

  const anthropic = new Anthropic({ apiKey });
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 1024,
    system:
      'You draft one section of a World Sailing race protest committee decision. ' +
      'Formal, neutral, third person. Use only the facts given to you — never invent ' +
      'a boat, person, rule, or event you were not told about. Only cite rules that ' +
      'appear in the "Rules already cited for this case" list, and only state what a ' +
      'rule requires when its text was given to you below — if a cited rule has no text ' +
      'attached, mention its number only, never guess its content. If none apply, cite none. ' +
      'If the drafter\'s own current text for this section is given below, your job is to ' +
      'turn THAT into a polished section — expand, formalize and correct it, in the same ' +
      'order and covering the same points — never replace it with unrelated content of your ' +
      'own invention, and never drop a fact it states. Only when no current text is given do ' +
      'you draft the section from scratch, from the case data alone. ' +
      'Return only the drafted section text, no heading, no preamble.',
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  const citations = validateCitations(extractCitations(text), eventId);
  return { text, citations };
}

interface RuleExcerpt {
  reference: string;
  excerpt: string | null;
}

function buildPrompt(
  box: DraftBox,
  caseRow: CaseRow,
  parties: { role: string; sail_number: string | null; boat_name: string | null }[],
  witnesses: { full_name: string; role: string | null }[],
  ruleExcerpts: RuleExcerpt[],
  currentBoxText: string,
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

  if (ruleExcerpts.length > 0) {
    lines.push('');
    lines.push('Rules already cited for this case (cite only from this list):');
    for (const r of ruleExcerpts) {
      if (r.excerpt) {
        lines.push(`- ${r.reference}:`);
        lines.push(r.excerpt);
      } else {
        lines.push(`- ${r.reference} (text not found in the uploaded corpus — number only, no content)`);
      }
    }
  } else {
    lines.push('');
    lines.push('No rules have been cited for this case yet — cite none.');
  }

  const currentText = currentBoxText.trim();
  if (currentText) {
    lines.push('');
    lines.push(
      `The drafter's own current text for ${BOX_LABEL[box]} — draft this into a polished ` +
        `section, do not replace it with something unrelated:`,
    );
    lines.push(currentText);
  }

  return lines.join('\n');
}

// Matches "RRS 42.1(a)", "rule 18.2", "NoR 1.9", "SI Addendum E 2.14", "RRS Appendix B 44".
// Deliberately requires the keyword so ordinary numbers (race numbers, dates)
// never get treated as a citation. NoR, CR and SI are matched in their canonical
// form only, so the English word "si" or "cr" before a number does not count
// (SPEC-022 RF-010). "Rule" is an input alias of RRS.
const CITATION_PATTERN =
  /\b(?:[Rr][Rr][Ss]|[Rr]ule|NoR|CR|SI)\s+(?:(?:Appendix|Addendum)\s+[A-Z]\d?\s+)?[A-Za-z]{0,2}\.?\d+(?:\.\d+)*(?:\([a-z]\))?/g;

export interface ExtractedCitation {
  text: string; // as written by the model
  citation: ParsedCitation;
}

export function extractCitations(text: string): ExtractedCitation[] {
  const found = new Map<string, ExtractedCitation>();
  for (const match of text.matchAll(CITATION_PATTERN)) {
    const citation = parseCitation(match[0]);
    if (!citation) continue;
    const key = formatCitation({ ...citation, prefix: citation.prefix ?? 'RRS' });
    if (!found.has(key)) found.set(key, { text: match[0], citation });
  }
  return [...found.values()];
}

// Sections of the corpus a citation resolves to for this case's event, with the
// suffix "(a)" required to appear in the section body (SPEC-022 RF-009).
function resolveSections(citation: ParsedCitation, eventId: number | null) {
  const resolved = { ...citation, prefix: citation.prefix ?? ('RRS' as const) };
  const sections = sectionsForCitation(resolved, eventId);
  const suffix = citation.suffix;
  return suffix ? sections.filter((s) => s.body.toLowerCase().includes(suffix)) : sections;
}

// The body of the rule's section (newest accepted document first), so the AI is
// grounded in what the rule says instead of the bare number. Free-text
// references that do not resolve get no excerpt: the prompt then says "text not
// found" and the model must not guess.
function findExcerpt(reference: string, eventId: number | null, maxChars = 1500): string | null {
  const citation = parseCitation(reference);
  if (!citation) return null;
  const section = resolveSections(citation, eventId)[0];
  return section ? section.body.slice(0, maxChars) : null;
}

// Checks each citation the AI wrote against the rule index (D-020, D-034): it
// must be a numbered rule of an accepted document of the prefix named, and for
// NoR / SI of the case's event; matched on token boundaries so 4 is not 44.
export function validateCitations(references: ExtractedCitation[], eventId: number | null): CitationCheck[] {
  return references.map((r) => ({
    reference: r.text,
    found: resolveSections(r.citation, eventId).length > 0,
  }));
}

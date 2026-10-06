import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db/connection.js';

export interface NotesExtraction {
  procedural_matters_candidate: string;
  facts_found_candidates: string[];
  conclusion_candidate: string;
  decision_candidate: string;
}

interface PartyBoatRow {
  role: 'initiator' | 'respondent';
  sail_number: string | null;
}

// Mirrors extractFromAttachments (ai/extract.ts) — same pipeline,
// Anthropic + JSON-only, same grounding rule (never invent) — but the
// source is this case's free-form hearing notes instead of an
// uploaded protest form, and the only output is candidates for the 4
// writing boxes (no parties/witnesses/day/race — that's the protest
// form's job, SPEC-017 scope).
export async function extractFromNotes(caseId: number, notes: string): Promise<NotesExtraction> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured on the server');
  if (!notes.trim()) throw new Error('no notes to process');

  const boats = db
    .prepare(
      `SELECT party.role, boat.sail_number
       FROM party LEFT JOIN boat ON boat.id = party.boat_id
       WHERE party.case_id = ?`,
    )
    .all(caseId) as unknown as PartyBoatRow[];
  const knownBoats =
    boats
      .filter((b) => b.sail_number)
      .map((b) => `${b.sail_number} (${b.role})`)
      .join(', ') || 'none registered yet';

  const prompt = [
    'A protest committee member wrote these free-form notes during a hearing:',
    '',
    notes,
    '',
    `Boats already registered on this case (resolve a shorthand sail number against this list only, e.g. "004" -> the one entry below ending in those digits — if it does not unambiguously match one of these, keep the note's original text instead of guessing): ${knownBoats}`,
    '',
    'Return JSON only, matching this exact shape (omit/empty a field if the notes have nothing for it — never invent):',
    JSON.stringify(
      {
        procedural_matters_candidate: 'string',
        facts_found_candidates: ['string'],
        conclusion_candidate: 'string',
        decision_candidate: 'string',
      },
      null,
      2,
    ),
  ].join('\n');

  const anthropic = new Anthropic({ apiKey });
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 2048,
    system:
      "You turn a protest committee member's shorthand hearing notes into draft material for " +
      'a protest decision document, for the scribe to review and insert box by box. ' +
      'A sail number shorthand (e.g. "004") resolves ONLY against the boats list given — if it ' +
      'unambiguously matches exactly one entry, write the full sail number with its country ' +
      "prefix (e.g. \"ITA 32004\"); if it is ambiguous or matches none, leave the note's own " +
      'wording as written rather than guessing. Never invent a boat, person, rule, or fact not ' +
      'in the notes. ' +
      'facts_found_candidates is a breakdown into individual discrete facts, one clause or ' +
      'event per entry, short and objective — same style as a protest form extraction\'s facts ' +
      'breakdown. procedural_matters_candidate/conclusion_candidate/decision_candidate are each ' +
      'a single short paragraph, only filled if the notes actually contain material for that ' +
      "box — most hearings' notes will leave conclusion_candidate/decision_candidate empty, " +
      'since those are usually decided after, not noted during, the hearing; never force ' +
      'something into them. ALWAYS write every field in English, even when the notes are in ' +
      'another language. Return ONLY the JSON object, no markdown code fence, no explanation.',
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  return parseNotesExtraction(text);
}

function parseNotesExtraction(text: string): NotesExtraction {
  const unfenced = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  let parsed: Partial<NotesExtraction>;
  try {
    parsed = JSON.parse(unfenced);
  } catch {
    const start = unfenced.indexOf('{');
    const end = unfenced.lastIndexOf('}');
    if (start === -1 || end <= start) throw new Error('extraction did not return valid JSON');
    try {
      parsed = JSON.parse(unfenced.slice(start, end + 1));
    } catch {
      throw new Error('extraction did not return valid JSON');
    }
  }
  return {
    procedural_matters_candidate: parsed.procedural_matters_candidate ?? '',
    facts_found_candidates: parsed.facts_found_candidates ?? [],
    conclusion_candidate: parsed.conclusion_candidate ?? '',
    decision_candidate: parsed.decision_candidate ?? '',
  };
}

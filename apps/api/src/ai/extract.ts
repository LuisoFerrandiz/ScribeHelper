import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db/connection.js';
import { readMarkdown } from '../resources/storage.js';

export interface AttachmentExtraction {
  parties: {
    initiator?: { sail_number?: string; boat_name?: string; represented_by?: string };
    respondent?: { sail_number?: string; boat_name?: string; represented_by?: string };
  };
  witnesses: { full_name: string; role?: string }[];
  procedural_matters_candidate: string;
  facts_found_candidate: string;
  facts_found_candidates: string[]; // discrete, one-per-entry, click-to-insert facts
  conclusion_candidate: string;
  decision_candidate: string;
  rule_citations_candidate: string[];
}

interface AttachmentRow {
  original_filename: string;
  markdown_path: string | null;
}

// Reads this case's uploaded protest form(s) (DECISIONS.md D-027) and
// asks the model to pull out what they already state, as suggestions for
// the drafter to review and insert box by box — nothing here writes to
// the case (RULES.md R-06/R-07). Text-only: a diagram in the form is
// invisible to this step, same as it is to the stored Markdown (no OCR/
// vision, D-010).
export async function extractFromAttachments(caseId: number): Promise<AttachmentExtraction> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured on the server');

  const attachments = db
    .prepare('SELECT original_filename, markdown_path FROM case_attachment WHERE case_id = ?')
    .all(caseId) as unknown as AttachmentRow[];

  const withMarkdown = attachments.filter((a) => a.markdown_path);
  if (withMarkdown.length === 0) {
    throw new Error('no processable attachments for this case');
  }

  const bodies = await Promise.all(
    withMarkdown.map(async (a) => {
      const body = await readMarkdown(a.markdown_path!);
      return `--- ${a.original_filename} ---\n${body}`;
    }),
  );

  const prompt = [
    'Extract what the following uploaded protest form(s) state, for a race protest committee scribe to review.',
    '',
    ...bodies,
    '',
    'Return JSON only, matching this exact shape (omit a field entirely if the form does not state it — never guess or invent):',
    JSON.stringify(
      {
        parties: {
          initiator: { sail_number: 'e.g. "ITA 32004", country + number', boat_name: 'string', represented_by: 'string' },
          respondent: { sail_number: 'e.g. "ITA 32004", country + number', boat_name: 'string', represented_by: 'string' },
        },
        witnesses: [{ full_name: 'string', role: 'string' }],
        procedural_matters_candidate: 'string',
        facts_found_candidate: 'string',
        facts_found_candidates: ['string'],
        conclusion_candidate: 'string',
        decision_candidate: 'string',
        rule_citations_candidate: ['string'],
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
      'You extract information from race protest forms for a protest committee scribe. ' +
      'Use only what the form(s) actually state — never invent a boat, person, rule, or ' +
      'fact. A sail number ALWAYS includes its country/national letters, e.g. "ITA 32004", ' +
      'never the bare number "32004" alone — everywhere a sail number appears (parties, ' +
      'witnesses, facts, procedural matters), write it with its country prefix, exactly as ' +
      'the form gives it. Which party is "initiator" (the one filing the protest) and which is ' +
      '"respondent" (protested against) must be clear from the form; if it is not clear, ' +
      'omit the parties field entirely rather than guessing. ' +
      'boat_name is only an actual vessel name — a PERSON\'S NAME IS NEVER a boat_name. ' +
      'Forms often list a party as "<class> - <sail number> - <person name>", e.g. ' +
      '"Boys\' Dinghy ILCA4 - JPN 228221 - MORI Ikuto": here "MORI Ikuto" is a person and ' +
      'goes in represented_by (sail_number: "JPN 228221"), never in boat_name. Only put a ' +
      'name in boat_name if the form explicitly labels it as the boat\'s name, not a ' +
      'person filing or sailing it. ' +
      'facts_found_candidate is the account reported BY THE PARTY who filed the form — it ' +
      'is not a verified finding; a protest committee\'s actual Facts Found are decided ' +
      'after a hearing, not copied from one party\'s account. Word it accordingly (e.g. ' +
      '"According to the protestor, ..."), never as an established fact. ' +
      'facts_found_candidates is a separate breakdown of the SAME material into individual ' +
      'discrete facts — read the entire form, not just one field of it (description of ' +
      'incident, damage, remarks, anywhere a fact appears). One clause or event per entry, ' +
      'short and objective, e.g. "32004 and 31929 were OCS in race 1.", "There was a ' +
      'collision between 32004 and 31929.", "32004 retired from races 1 and 2." — never ' +
      'combine more than one fact into a single entry. Keep sail numbers, boat names, rule ' +
      'references, and numbers exactly as given; translate only the surrounding prose. ' +
      'ALWAYS write every entry in English, even when the form itself is in another ' +
      'language. Order entries roughly as the form reports them, not reordered by ' +
      'importance. Same grounding rule as everywhere else: never invent a fact not in the ' +
      'form. ' +
      'conclusion_candidate and decision_candidate are almost always empty, since a protest ' +
      'form is filed before the hearing, not after — only fill them if the form itself ' +
      'already documents a conclusion or decision (e.g. a re-submitted or annotated form). ' +
      'Return ONLY the JSON object, no markdown code fence, no explanation.',
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  return parseExtraction(text);
}

// The model is told to return JSON only, but sometimes wraps it in a
// ```json fence or adds a stray sentence anyway — strip a fence if
// present, then fall back to the first {...} block before giving up.
function parseExtraction(text: string): AttachmentExtraction {
  const unfenced = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  let parsed: Partial<AttachmentExtraction>;
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

  // The model is also told to omit fields it found nothing for — normalize
  // to a guaranteed shape here so the frontend never has to guard against
  // an absent array/object.
  return {
    parties: parsed.parties ?? {},
    witnesses: parsed.witnesses ?? [],
    procedural_matters_candidate: parsed.procedural_matters_candidate ?? '',
    facts_found_candidate: parsed.facts_found_candidate ?? '',
    facts_found_candidates: parsed.facts_found_candidates ?? [],
    conclusion_candidate: parsed.conclusion_candidate ?? '',
    decision_candidate: parsed.decision_candidate ?? '',
    rule_citations_candidate: parsed.rule_citations_candidate ?? [],
  };
}

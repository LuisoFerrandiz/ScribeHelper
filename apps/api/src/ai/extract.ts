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
          initiator: { sail_number: 'string', boat_name: 'string', represented_by: 'string' },
          respondent: { sail_number: 'string', boat_name: 'string', represented_by: 'string' },
        },
        witnesses: [{ full_name: 'string', role: 'string' }],
        procedural_matters_candidate: 'string',
        facts_found_candidate: 'string',
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
      'fact. Which party is "initiator" (the one filing the protest) and which is ' +
      '"respondent" (protested against) must be clear from the form; if it is not clear, ' +
      'omit the parties field entirely rather than guessing. ' +
      'facts_found_candidate is the account reported BY THE PARTY who filed the form — it ' +
      'is not a verified finding; a protest committee\'s actual Facts Found are decided ' +
      'after a hearing, not copied from one party\'s account. Word it accordingly (e.g. ' +
      '"According to the protestor, ..."), never as an established fact. ' +
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

  try {
    return JSON.parse(text) as AttachmentExtraction;
  } catch {
    throw new Error('extraction did not return valid JSON');
  }
}

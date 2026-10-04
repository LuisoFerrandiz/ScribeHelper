import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db/connection.js';
import { readMarkdown } from '../resources/storage.js';

export type ExampleSuggestionBox = 'procedural_matters' | 'facts_found';

const BOX_SECTION_HINT: Record<ExampleSuggestionBox, string> = {
  procedural_matters: 'Procedural Matters',
  facts_found: 'Facts Found',
};

interface ExampleRow {
  markdown_path: string;
}

// SPEC-005 RF-004 (reused by SPEC-006 for facts_found, D-028-style
// generic design from the start): mines accepted examples/ (base + own)
// for phrases a drafter could reuse in a NEW case — generalized, never
// the specific sail numbers/boat names/dates of the example they came
// from. Replaces "AI draft" for the boxes this function supports; the
// other two boxes (conclusion/decision) keep the single-draft panel
// until their own specs.
export async function suggestPhrasesFromExamples(box: ExampleSuggestionBox): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured on the server');

  const examples = db
    .prepare(
      `SELECT markdown_path FROM resource
       WHERE kind = 'example' AND status = 'accepted' AND markdown_path IS NOT NULL`,
    )
    .all() as unknown as ExampleRow[];

  if (examples.length === 0) return [];

  const bodies = await Promise.all(examples.map((e) => readMarkdown(e.markdown_path)));
  const sectionName = BOX_SECTION_HINT[box];

  const prompt = [
    `The following are complete past protest committee decisions, used as style examples (never as authority — they are not rules).`,
    `Find each one's "${sectionName}" section (or equivalent wording — examples vary in format) and extract phrases a drafter could reuse for a NEW, unrelated case.`,
    '',
    ...bodies.map((body, i) => `--- Example ${i + 1} ---\n${body}`),
    '',
    'Return JSON only: { "phrases": string[] }',
  ].join('\n');

  const anthropic = new Anthropic({ apiKey });
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 1536,
    system:
      `You extract reusable phrases from the "${sectionName}" section of past protest committee decisions, ` +
      'for a drafter writing a different, unrelated case. ' +
      'Use only phrases present in or closely adapted from those sections — never invent content with no ' +
      'basis in the examples given. ' +
      'ALWAYS generalize away anything specific to the example it came from: sail numbers, boat names, ' +
      "people's names, dates, race numbers. A candidate phrase must be reusable in any case, never citing " +
      "one example's own facts. " +
      'Never return near-duplicate phrases — if two examples say essentially the same thing, return it once. ' +
      'If none of the examples have usable content for this section, return an empty list — an empty list ' +
      'is better than an invented phrase. ' +
      'Return ONLY the JSON object, no markdown code fence, no explanation.',
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  return parsePhrases(text);
}

function parsePhrases(text: string): string[] {
  const unfenced = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  let parsed: { phrases?: unknown };
  try {
    parsed = JSON.parse(unfenced);
  } catch {
    const start = unfenced.indexOf('{');
    const end = unfenced.lastIndexOf('}');
    if (start === -1 || end <= start) return [];
    try {
      parsed = JSON.parse(unfenced.slice(start, end + 1));
    } catch {
      return [];
    }
  }
  return Array.isArray(parsed.phrases) ? parsed.phrases.filter((p): p is string => typeof p === 'string') : [];
}

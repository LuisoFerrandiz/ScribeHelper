import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db/connection.js';
import { readMarkdown } from '../resources/storage.js';

export type ExampleSuggestionBox = 'procedural_matters' | 'facts_found' | 'conclusion' | 'decision';

const BOX_SECTION_HINT: Record<ExampleSuggestionBox, string> = {
  procedural_matters: 'Procedural Matters',
  facts_found: 'Facts Found',
  conclusion: 'Conclusion',
  decision: 'Decision',
};

interface ExampleRow {
  markdown_path: string;
}

// SPEC-005 RF-004 (reused by SPEC-006/007/008 for facts_found/
// conclusion/decision, generic design from the start): mines accepted
// examples/ (base + own) for phrases a drafter could reuse in a NEW
// case — generalized, never the specific sail numbers/boat names/dates
// of the example they came from. Replaces "AI draft" for every box.
// Output budget: the answer is a JSON list of phrases. Too small a budget cuts the
// JSON mid-list and, before this limit was raised and the parser made tolerant, every
// box silently answered "no suggestions".
const MAX_OUTPUT_TOKENS = 3000;
const MAX_PHRASES = 15;

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
    `Return JSON only: { "phrases": string[] } with at most ${MAX_PHRASES} phrases, each one sentence.`,
  ].join('\n');

  const anthropic = new Anthropic({ apiKey });
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: MAX_OUTPUT_TOKENS,
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

  const { phrases, readable } = parsePhrases(text);
  if (!readable) {
    // Not a legitimate empty list ({"phrases": []}): the answer could not be read.
    // Say so (502) instead of a silent "no usable suggestions".
    console.warn(`[example-suggestions] unreadable model answer for ${box}: stop_reason=${message.stop_reason}, ${text.length} chars, ${phrases.length} salvaged`);
    if (phrases.length === 0) {
      throw new Error(
        message.stop_reason === 'max_tokens'
          ? 'The model answer was cut off before it finished. Try again.'
          : 'The model answer could not be read. Try again.',
      );
    }
  }
  return phrases;
}

// readable: the answer was a JSON object with a "phrases" list (possibly empty).
export function parsePhrases(text: string): { phrases: string[]; readable: boolean } {
  const unfenced = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  let parsed: { phrases?: unknown };
  try {
    parsed = JSON.parse(unfenced);
  } catch {
    const start = unfenced.indexOf('{');
    const end = unfenced.lastIndexOf('}');
    if (start === -1 || end <= start) return { phrases: salvagePhrases(unfenced), readable: false };
    try {
      parsed = JSON.parse(unfenced.slice(start, end + 1));
    } catch {
      return { phrases: salvagePhrases(unfenced), readable: false };
    }
  }
  if (!Array.isArray(parsed.phrases)) return { phrases: [], readable: false };
  return { phrases: parsed.phrases.filter((p): p is string => typeof p === 'string'), readable: true };
}

// A list cut off by the token limit ("phrases": ["a", "b", "c…) still holds complete
// strings: keep those, drop the unfinished last one.
function salvagePhrases(text: string): string[] {
  const open = /"phrases"\s*:\s*\[/.exec(text);
  if (!open) return [];
  const out: string[] = [];
  const re = /"((?:[^"\\]|\\.)*)"\s*(?:,|\])/g;
  re.lastIndex = open.index + open[0].length;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    try {
      out.push(JSON.parse(`"${m[1]}"`) as string);
    } catch {
      // skip a string that is not valid JSON
    }
  }
  return out.slice(0, MAX_PHRASES);
}

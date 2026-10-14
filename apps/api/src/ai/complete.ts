import Anthropic from '@anthropic-ai/sdk';
import type { DraftBox } from './draft.js';

// SPEC-023: Rules Applicable is a writing box too (D-032), but it is not a
// DraftBox: the draft panel and the phrase library stay on the four.
export type CompleteBox = DraftBox | 'rules_applicable';

const BOX_LABEL: Record<CompleteBox, string> = {
  procedural_matters: 'Procedural Matters',
  facts_found: 'Facts Found',
  conclusion: 'Conclusion',
  rules_applicable: 'Rules Applicable',
  decision: 'Decision',
};

// Rules Applicable: prose only. The model must never write a rule number,
// prefix (RRS, NoR, SI, CR) or rule section — a rule is only cited when the
// drafter picks it from the corpus (D-004, SPEC-023 RF-003).
const RULES_BOX_SYSTEM =
  'Continue the sentence the drafter is writing in the "Rules Applicable" section of a ' +
  'World Sailing race protest committee decision. Formal, neutral, third person. ' +
  'Output only the continuation — the text that comes immediately after what was given, ' +
  'never repeat any of it. Stop after at most one sentence. Write plain prose only: ' +
  'NEVER write a rule number, a rule prefix (RRS, NoR, SI, CR), a section reference, ' +
  'an appendix letter or any digit that could be read as part of a rule. ' +
  'If the given text ends in the middle of a rule reference, or already ends a complete ' +
  'thought, output nothing.';

// Only the tail of the box is sent — bounds token cost on a call that
// fires automatically while typing (Phase 5, CONTEXT.md section 9).
const MAX_CONTEXT_CHARS = 1500;

// Phase 5: inline ghost-text completion (D-025). Separate from the
// draft panel (D-024) on purpose: this fires on a typing pause, so it
// must be fast and cheap (Haiku 4.5, short output) and it must never
// introduce a new fact or rule citation — it only continues wording the
// drafter has already committed to, it does not draft new content.
export async function generateInlineCompletion(box: CompleteBox, text: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured on the server');

  const tail = text.length > MAX_CONTEXT_CHARS ? text.slice(-MAX_CONTEXT_CHARS) : text;

  const anthropic = new Anthropic({ apiKey });
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 60,
    system:
      box === 'rules_applicable'
        ? RULES_BOX_SYSTEM
        : `Continue the sentence the drafter is writing in the "${BOX_LABEL[box]}" section of a ` +
      'World Sailing race protest committee decision. Formal, neutral, third person. ' +
      'Output only the continuation — the text that comes immediately after what was given, ' +
      'never repeat any of it. Stop after at most one sentence. Never introduce a rule ' +
      'reference, boat, person, or fact that is not already implied by the given text. ' +
      'If the given text already ends a complete thought, output nothing.',
    messages: [{ role: 'user', content: tail }],
  });

  const suggestion = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();

  // Deterministic backstop for the prompt rule above: a Rules Applicable
  // suggestion that mentions a digit or a rule prefix is dropped (D-004).
  if (box === 'rules_applicable' && /\d|\b(RRS|NoR|SI|CR)\b/i.test(suggestion)) return '';
  return suggestion;
}

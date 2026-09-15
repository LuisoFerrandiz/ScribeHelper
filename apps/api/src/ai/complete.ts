import Anthropic from '@anthropic-ai/sdk';
import type { DraftBox } from './draft.js';

const BOX_LABEL: Record<DraftBox, string> = {
  procedural_matters: 'Procedural Matters',
  facts_found: 'Facts Found',
  conclusion: 'Conclusion',
  decision: 'Decision',
};

// Only the tail of the box is sent — bounds token cost on a call that
// fires automatically while typing (Phase 5, CONTEXT.md section 9).
const MAX_CONTEXT_CHARS = 1500;

// Phase 5: inline ghost-text completion (D-025). Separate from the
// draft panel (D-024) on purpose: this fires on a typing pause, so it
// must be fast and cheap (Haiku 4.5, short output) and it must never
// introduce a new fact or rule citation — it only continues wording the
// drafter has already committed to, it does not draft new content.
export async function generateInlineCompletion(box: DraftBox, text: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured on the server');

  const tail = text.length > MAX_CONTEXT_CHARS ? text.slice(-MAX_CONTEXT_CHARS) : text;

  const anthropic = new Anthropic({ apiKey });
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 60,
    system:
      `Continue the sentence the drafter is writing in the "${BOX_LABEL[box]}" section of a ` +
      'World Sailing race protest committee decision. Formal, neutral, third person. ' +
      'Output only the continuation — the text that comes immediately after what was given, ' +
      'never repeat any of it. Stop after at most one sentence. Never introduce a rule ' +
      'reference, boat, person, or fact that is not already implied by the given text. ' +
      'If the given text already ends a complete thought, output nothing.',
    messages: [{ role: 'user', content: tail }],
  });

  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();
}

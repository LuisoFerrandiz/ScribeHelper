import type { AttachmentExtraction } from './types';
import type { SuggestionItem } from './suggestionItems';

// SPEC-032: the protest form states ONE side's position (never the committee's).
// Pure helpers, kept out of CaseForm.

type Position = NonNullable<AttachmentExtraction['party_position']>;
const SIDES = ['initiator', 'respondent'] as const;

export const PARTY_CLAIM_TAG = 'Party claim — not final';

// One click-to-insert item per side that has text for this box (initiator first).
export function partyPositionItems(
  extraction: AttachmentExtraction | null | undefined,
  field: 'conclusion' | 'decision',
): SuggestionItem[] {
  const position: Position = extraction?.party_position ?? {};
  const items: SuggestionItem[] = [];
  for (const side of SIDES) {
    const text = position[side]?.[field]?.trim();
    if (text) items.push({ id: `party_position:${side}`, text, source: 'party_position', tag: PARTY_CLAIM_TAG });
  }
  return items;
}

// Context string for the AI ghost: undefined when no side has any text.
export function partyPositionContext(extraction: AttachmentExtraction | null | undefined): string | undefined {
  const position: Position = extraction?.party_position ?? {};
  const lines: string[] = [];
  for (const side of SIDES) {
    const p = position[side];
    const parts = [p?.conclusion?.trim(), p?.decision?.trim()].filter((t): t is string => !!t);
    if (parts.length) lines.push(`${side === 'initiator' ? 'Initiator' : 'Respondent'}: ${parts.join(' ')}`);
  }
  return lines.length ? lines.join('\n') : undefined;
}

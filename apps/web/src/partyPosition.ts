import type { AttachmentExtraction } from './types';

// SPEC-032: the protest form states ONE side's position (never the committee's).
// SPEC-034: it is no longer offered as an insertable card; it stays only as read-only
// context for the AI ghost text. Pure helper, kept out of CaseForm.

type Position = NonNullable<AttachmentExtraction['party_position']>;
const SIDES = ['initiator', 'respondent'] as const;

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

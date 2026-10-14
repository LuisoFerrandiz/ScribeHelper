// SPEC-026 — what a writing box still has to fill: [gaps] and X / Y labels left
// from library phrases. Same definition as SPEC-025 (phraseGaps); informative
// only, never blocks and never edits the text.
import { normalizePhraseText, phraseGaps, type PartyLabel } from './phraseGaps';

export interface PendingMarks {
  gaps: string[];
  parties: PartyLabel[];
  count: number;
}

export function pendingMarks(text: string): PendingMarks {
  const t = normalizePhraseText(text);
  const { gaps, parties } = phraseGaps(t);
  const gapTexts = gaps.map((g) => t.slice(g.start, g.end));
  const labels = parties.map((p) => p.label);
  return { gaps: gapTexts, parties: labels, count: gapTexts.length + labels.length };
}

// "2 gaps, 1 party label (X/Y) still to fill"
export function describePending(p: PendingMarks): string {
  const parts: string[] = [];
  if (p.gaps.length > 0) parts.push(`${p.gaps.length} ${p.gaps.length === 1 ? 'gap' : 'gaps'}`);
  if (p.parties.length > 0) {
    parts.push(`${p.parties.length} party ${p.parties.length === 1 ? 'label' : 'labels'} (X/Y)`);
  }
  return `${parts.join(', ')} still to fill`;
}

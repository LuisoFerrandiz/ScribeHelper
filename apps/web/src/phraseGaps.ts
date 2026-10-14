// SPEC-025 RF-001 — the only code that decides what is a gap or a party label
// inside phrase text. Pure functions, no DOM, no network.

export interface Range {
  start: number;
  end: number; // exclusive
}

// 'XY' is a group of two bracketed labels written together ("[X] [Y]"), which
// is replaced as one.
export type PartyLabel = 'X' | 'Y' | 'XY';

export interface PartyRange extends Range {
  label: PartyLabel;
}

export interface PhraseGaps {
  gaps: Range[]; // Tab stops, in text order
  parties: PartyRange[]; // X / Y labels, resolved with the party bar, never Tab stops
}

// A textarea reports its value with \n only; phrase text comes with \r\n.
export function normalizePhraseText(text: string): string {
  return text.replace(/\r\n/g, '\n');
}

// Index of the ']' that closes the '[' at `open`, counting nesting; -1 if none.
function matchingClose(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '[') depth++;
    else if (text[i] === ']') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

const WORD_CHAR = /[A-Za-z0-9-]/;

// `X` / `Y` as a lone capital letter: not glued to letters, digits or hyphens
// (so "X-ray", "XL" and "Y-shaped" are not labels); "Y’s" and a final "X." are;
// "Appendix X" is a rule reference, not a party.
function isPartyWord(text: string, i: number): boolean {
  const before = i === 0 ? '' : text[i - 1];
  if (before && WORD_CHAR.test(before)) return false;
  const after = text[i + 1] ?? '';
  if (after && WORD_CHAR.test(after)) return false;
  if (after === '.' && /[A-Za-z0-9]/.test(text[i + 2] ?? '')) return false;
  if (/Appendix\s+$/i.test(text.slice(Math.max(0, i - 12), i))) return false;
  return true;
}

const GLUE = /^[ \t ]*$/;

export function phraseGaps(text: string): PhraseGaps {
  const gaps: Range[] = [];
  const found: (PartyRange & { bracketed: boolean })[] = [];

  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '[') {
      const close = matchingClose(text, i);
      if (close === -1) {
        i++; // an unclosed '[' is plain text
        continue;
      }
      const inner = text.slice(i + 1, close).trim();
      if (inner === 'X' || inner === 'Y') {
        found.push({ start: i, end: close + 1, label: inner, bracketed: true });
      } else {
        gaps.push({ start: i, end: close + 1 });
      }
      i = close + 1;
      continue;
    }
    if ((c === 'X' || c === 'Y') && isPartyWord(text, i)) {
      found.push({ start: i, end: i + 1, label: c, bracketed: false });
    }
    i++;
  }

  // "[X] [Y]" / "[X][Y]": two bracketed labels with only blanks between them
  // are one group, replaced as a unit.
  const parties: PartyRange[] = [];
  for (const p of found) {
    const last = parties[parties.length - 1] as (PartyRange & { bracketed?: boolean }) | undefined;
    if (p.bracketed && last?.bracketed && GLUE.test(text.slice(last.end, p.start))) {
      last.end = p.end;
      last.label = 'XY';
    } else {
      parties.push({ start: p.start, end: p.end, label: p.label, ...(p.bracketed ? { bracketed: true } : {}) } as PartyRange);
    }
  }
  return {
    gaps,
    parties: parties.map(({ start, end, label }) => ({ start, end, label })),
  };
}

// First gap that starts at or after `from` (a Tab from the end of the current selection).
export function nextGap(gaps: Range[], from: number): Range | null {
  return gaps.find((g) => g.start >= from) ?? null;
}

// Last gap that ends at or before `before` (a Shift+Tab from the start of the selection).
export function prevGap(gaps: Range[], before: number): Range | null {
  for (let k = gaps.length - 1; k >= 0; k--) {
    if (gaps[k].end <= before) return gaps[k];
  }
  return null;
}

// Replaces every X (or Y) label of `zoneText`, and every "[X] [Y]" group, by `value`.
export function replaceParty(zoneText: string, label: 'X' | 'Y', value: string): string {
  const { parties } = phraseGaps(zoneText);
  let out = zoneText;
  for (const p of [...parties].reverse()) {
    if (p.label === label || p.label === 'XY') out = out.slice(0, p.start) + value + out.slice(p.end);
  }
  return out;
}

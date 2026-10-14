// SPEC-031 — which gaps of a phrase are DATA gaps (the only ones the AI may
// propose a value for) and how an accepted value replaces its gap. Pure: no
// DOM, no network. Built on phraseGaps (SPEC-025): the single definition of a gap.
import { normalizePhraseText, phraseGaps } from './phraseGaps';

// Keep identical to isDataGapText in apps/api/src/ai/fillGaps.ts (two
// projects, tsc will not catch drift).
const DATA_WORDS = new Set(['date', 'time', 'day', 'race', 'number', 'race number', 'time limit', 'minutes', 'hours']);

export function isDataGapText(gapText: string): boolean {
  if (!gapText.startsWith('[') || !gapText.endsWith(']')) return false;
  const inner = gapText.slice(1, -1).trim().toLowerCase();
  if (inner.includes('[') || inner.includes(']')) return false;
  return inner.includes('##') || DATA_WORDS.has(inner);
}

const GLUE = /^\s*$/;
const CONTEXT_CHARS = 80;

export interface DataGap {
  index: number; // position in phraseGaps(text).gaps
  text: string; // "[race ##]"
  before: string; // up to 80 characters before, cut at a word boundary
  after: string;
}

// "…in the middle of a word" is cut off so the model never sees a half word.
function cutBefore(s: string): string {
  const t = s.slice(-CONTEXT_CHARS);
  return t.length < s.length ? t.replace(/^\S*\s/, '') : t;
}
function cutAfter(s: string): string {
  const t = s.slice(0, CONTEXT_CHARS);
  return t.length < s.length ? t.replace(/\s\S*$/, '') : t;
}

// A gap glued to another one (only blanks between) is one of several
// alternatives: a decision of the drafter, never a data gap.
export function dataGaps(rawText: string): DataGap[] {
  const text = normalizePhraseText(rawText);
  const { gaps } = phraseGaps(text);
  const out: DataGap[] = [];
  gaps.forEach((g, i) => {
    const glued =
      (i > 0 && GLUE.test(text.slice(gaps[i - 1].end, g.start))) ||
      (i < gaps.length - 1 && GLUE.test(text.slice(g.end, gaps[i + 1].start)));
    const gapText = text.slice(g.start, g.end);
    if (glued || !isDataGapText(gapText)) return;
    out.push({
      index: i,
      text: gapText,
      before: cutBefore(text.slice(0, g.start)),
      after: cutAfter(text.slice(g.end)),
    });
  });
  return out;
}

const tail = (s: string, n: number) => s.slice(-n);
const head = (s: string, n: number) => s.slice(0, n);

// Is this still the gap that was sent? Same text and the same 20 characters of
// context on each side (tells two "[##]" apart).
function stillThere(text: string, gap: DataGap): { start: number; end: number } | null {
  const g = phraseGaps(text).gaps[gap.index];
  if (!g) return null;
  if (text.slice(g.start, g.end) !== gap.text) return null;
  if (!text.slice(0, g.start).endsWith(tail(gap.before, 20))) return null;
  if (!text.slice(g.end).startsWith(head(gap.after, 20))) return null;
  return g;
}

// Replaces the gap by `value` only if it is still the one that was sent;
// otherwise null and nothing is written.
export function replaceGapAt(rawText: string, gap: DataGap, value: string): string | null {
  const text = normalizePhraseText(rawText);
  const g = stillThere(text, gap);
  return g ? text.slice(0, g.start) + value + text.slice(g.end) : null;
}

// Accept all: every gap is checked against the ORIGINAL text (a replaced
// neighbour must not make the next one look changed), then applied from the
// last to the first so positions stay valid. Gaps that no longer match are
// returned in `stale` and left untouched.
export function replaceGapsAt(
  rawText: string,
  items: { gap: DataGap; value: string }[],
): { text: string; stale: DataGap[] } {
  const original = normalizePhraseText(rawText);
  const stale: DataGap[] = [];
  const ready: { start: number; end: number; value: string; index: number }[] = [];
  for (const { gap, value } of items) {
    const g = stillThere(original, gap);
    if (g) ready.push({ ...g, value, index: gap.index });
    else stale.push(gap);
  }
  let text = original;
  for (const r of ready.sort((a, b) => b.start - a.start)) text = text.slice(0, r.start) + r.value + text.slice(r.end);
  return { text, stale };
}

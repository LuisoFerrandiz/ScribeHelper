import { normalizePhraseText } from './phraseGaps';
import type { PhraseRow } from './types';

// SPEC-034 RF-004 — the instant layer of the proposals: which stored phrases fit
// what the scribe wrote and the hearing notes. Pure, no network. Words shared by
// almost every phrase of the library say nothing, so they are not counted.
const STOP = new Set(
  (
    'the and for with that this was were are has had have been from into onto upon not but its ' +
    'their there than then they them his her she him who whom which when where while what will ' +
    'would should could may might can per also any all one two out off over under after before ' +
    'protest protestor protestors protestee boat boats race races committee hearing party parties'
  ).split(' '),
);

export function contentWords(text: string): Set<string> {
  const out = new Set<string>();
  for (const w of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
    if (w.length >= 3 && !STOP.has(w)) out.add(w);
  }
  return out;
}

const MIN_SHARED_WORDS = 2;

// Phrases of the box ordered by shared content words with `text` + `notes`
// (best first); ties: own before base, then lowest id. Nothing written and no
// notes -> nothing (no outcome is proposed by id order).
export function rankPhrases(phrases: PhraseRow[], text: string, notes: string, max = 3): PhraseRow[] {
  const source = contentWords(`${text}\n${notes}`);
  if (source.size === 0) return [];
  const scored: { phrase: PhraseRow; score: number }[] = [];
  for (const phrase of phrases) {
    const body = normalizePhraseText(phrase.body);
    if (alreadyIn(text, body)) continue;
    let score = 0;
    for (const w of contentWords(body)) if (source.has(w)) score++;
    if (score >= MIN_SHARED_WORDS) scored.push({ phrase, score });
  }
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      (a.phrase.origin === b.phrase.origin ? 0 : a.phrase.origin === 'own' ? -1 : 1) ||
      a.phrase.id - b.phrase.id,
  );
  return scored.slice(0, max).map((s) => s.phrase);
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

// Is this proposal already in the box? The gaps of a phrase are wildcards, so a
// phrase whose gaps were filled in (or edited) still counts as present
// (SPEC-034 RF-003): all the fixed pieces appear, in order.
export function alreadyIn(boxText: string, proposal: string): boolean {
  const hay = norm(boxText);
  if (!hay) return false;
  const pieces = norm(proposal)
    .split(/\[[^\]]*\]/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (pieces.length === 0) return false;
  let from = 0;
  for (const piece of pieces) {
    const at = hay.indexOf(piece, from);
    if (at === -1) return false;
    from = at + piece.length;
  }
  return true;
}

import { useCallback, useEffect, useRef } from 'react';
import { api } from './api';
import { normalizePhraseText } from './phraseGaps';
import type { PhraseBox } from './types';

const MIN_PARAGRAPH_CHARS = 12;

interface Candidate {
  id: number;
  text: string; // \r\n -> \n, NBSP -> space (same length as the original)
  lower: string;
}

// SPEC-025 RF-007 — deterministic ghost text from the phrase library: the rest
// of a stored phrase whose body starts with the paragraph being typed. The
// phrases of the box are loaded once (offline-friendly, no request per
// keystroke); `refreshKey` reloads them after the user saves a phrase.
export function usePhraseCompletions(box: PhraseBox | undefined, refreshKey = 0) {
  const phrases = useRef<Candidate[]>([]);

  useEffect(() => {
    phrases.current = [];
    if (!box) return;
    let cancelled = false;
    api
      .listPhrases(box)
      .then((rows) => {
        if (cancelled) return;
        phrases.current = rows.map((r) => {
          const text = normalizePhraseText(r.body).replace(/ /g, ' ');
          return { id: r.id, text, lower: text.toLowerCase() };
        });
      })
      .catch(() => {
        /* no phrases: the AI completion still works */
      });
    return () => {
      cancelled = true;
    };
  }, [box, refreshKey]);

  // The rest of the best-matching phrase, or ''. Shortest phrase wins; ties go
  // to the lowest id. The phrase must be strictly longer than what is typed.
  return useCallback((value: string): string => {
    const cut = value.lastIndexOf('\n\n');
    const paragraph = value.slice(cut === -1 ? 0 : cut + 2).replace(/ /g, ' ');
    if (paragraph.length < MIN_PARAGRAPH_CHARS) return '';
    const typed = paragraph.toLowerCase();
    let best: Candidate | null = null;
    for (const p of phrases.current) {
      if (p.text.length <= paragraph.length || !p.lower.startsWith(typed)) continue;
      if (!best || p.text.length < best.text.length || (p.text.length === best.text.length && p.id < best.id)) {
        best = p;
      }
    }
    return best ? best.text.slice(paragraph.length) : '';
  }, []);
}

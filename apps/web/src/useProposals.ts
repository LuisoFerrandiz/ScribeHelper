import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api';
import { alreadyIn, rankPhrases } from './proposalRanking';
import { normalizePhraseText } from './phraseGaps';
import type { ChainContext, PhraseBox, PhraseRow, ProposalResult } from './types';

// SPEC-034 — live proposals of a writing box.
// Instant layer (RF-004): stored phrases that fit the text and the hearing notes,
// ranked in the browser, no network. AI layer (RF-006..RF-013): one request ~1.5 s
// after the scribe stops typing, only when the text, notes or candidates changed,
// one in flight at a time (a change meanwhile marks it "dirty" and relaunches once).
const DEBOUNCE_MS = 1500;

export interface ProposalCard {
  key: string;
  text: string;
}

export type AiState = 'idle' | 'loading' | 'ok' | 'unavailable' | 'failed';

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

interface Args {
  caseId: number;
  box: PhraseBox;
  text: string;
  notes: string;
  extras: string; // case-derived lines (protest form, hearing notes extraction) as one more source
  chain?: ChainContext;
  refreshKey?: number; // changes when the scribe saves a phrase
  instantLines?: string[]; // deterministic lines of the case (Procedural), no AI
}

export function useProposals({ caseId, box, text, notes, extras, chain, refreshKey = 0, instantLines = [] }: Args) {
  const [phrases, setPhrases] = useState<PhraseRow[]>([]);
  const [aiCards, setAiCards] = useState<ProposalCard[]>([]);
  const [aiState, setAiState] = useState<AiState>('idle');

  useEffect(() => {
    setPhrases([]);
    setAiCards([]);
    let cancelled = false;
    api
      .listPhrases(box)
      .then((rows) => {
        if (!cancelled) setPhrases(rows);
      })
      .catch(() => {
        /* no phrases: the AI layer still works */
      });
    return () => {
      cancelled = true;
    };
  }, [box, refreshKey]);

  const ranked = useMemo(() => rankPhrases(phrases, text, notes), [phrases, text, notes]);

  const latest = useRef({ text, notes, extras, chain, ranked });
  latest.current = { text, notes, extras, chain, ranked };
  const inflight = useRef(false);
  const dirty = useRef(false);
  const sentKey = useRef('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const fire = useCallback(() => {
    if (!alive.current) return;
    if (inflight.current) {
      dirty.current = true;
      return;
    }
    const l = latest.current;
    if (!l.text.trim() && !l.notes.trim()) {
      setAiState('idle');
      return;
    }
    const ids = l.ranked.map((p) => p.id).slice(0, 6);
    const key = [l.text, l.notes, l.extras, ids.join(',')].join('\u0000');
    if (key === sentKey.current) return;
    sentKey.current = key;
    inflight.current = true;
    dirty.current = false;
    setAiState('loading');
    api
      .postProposals(caseId, { box, text: l.text, notes: l.notes, extras: l.extras, context: l.chain, candidate_ids: ids })
      .then((res: ProposalResult) => {
        if (!alive.current || dirty.current) return; // superseded: the relaunch below replaces it
        setAiCards(res.proposals.map((p) => ({ key: `ai:${hash(p.text)}`, text: p.text })));
        setAiState(res.ai === 'ok' ? 'ok' : res.ai);
      })
      .catch(() => {
        if (alive.current && !dirty.current) setAiState('failed');
      })
      .finally(() => {
        inflight.current = false;
        if (alive.current && dirty.current) schedule();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, box]);

  function schedule() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(fire, DEBOUNCE_MS);
  }

  useEffect(() => {
    schedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, notes, extras, ranked, fire]);

  // RF-014: forces a new request even if nothing changed (e.g. an earlier box changed).
  const refresh = useCallback(() => {
    sentKey.current = '';
    if (timer.current) clearTimeout(timer.current);
    fire();
  }, [fire]);

  const cards = useMemo<ProposalCard[]>(() => {
    const instant: ProposalCard[] = [
      ...instantLines.filter((t) => t.trim()).map((t) => ({ key: `line:${hash(t)}`, text: t })),
      ...ranked.map((p) => ({ key: `phrase:${p.id}`, text: normalizePhraseText(p.body) })),
    ];
    const base = aiCards.length > 0 ? aiCards : instant;
    return base.filter((c) => !alreadyIn(text, c.text)).slice(0, 3);
  }, [aiCards, ranked, instantLines, text]);

  return { cards, aiState, refresh };
}

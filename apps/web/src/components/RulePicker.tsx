import { useEffect, useState } from 'react';
import { api } from '../api';
import { RuleHitList } from './RuleHitList';
import type { RuleSearchResult } from '../types';

interface Props {
  caseId: number;
  // Changes whenever the case's registered citations change, so "cited" is re-read.
  citationsKey: string;
  onAddSection: (sectionId: number) => Promise<void>;
}

// SPEC-022 RF-004/RF-005 — search the loaded rules by number or words; each
// result is one numbered rule with its canonical citation and an Add button
// that registers it and writes it into the Rules Applicable text.
export function RulePicker({ caseId, citationsKey, onAddSection }: Props) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<RuleSearchResult | null>(null);
  const [searching, setSearching] = useState(false);

  // Debounced search; `cancelled` drops the answer of an older query (race guard).
  useEffect(() => {
    if (!query.trim()) {
      setResult(null);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const handle = setTimeout(() => {
      api
        .searchRules(query.trim(), caseId)
        .then((r) => {
          if (!cancelled) setResult(r);
        })
        .catch(() => {
          if (!cancelled) setResult({ hits: [], otherEvents: false });
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, caseId, citationsKey]);

  return (
    <div className="rule-picker">
      <input
        placeholder="Search the rules (e.g. propulsion, 44.2, NoR 1.9)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {searching && <p className="muted">Searching…</p>}
      {!searching && result && result.hits.length === 0 && (
        <p className="muted">
          No rule found in the loaded corpus.
          {result.otherEvents && ' Notice of Race and Sailing Instructions only appear for their own regatta.'}
        </p>
      )}
      {result && <RuleHitList hits={result.hits} onAddSection={onAddSection} />}
    </div>
  );
}

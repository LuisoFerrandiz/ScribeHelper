import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import type { ResourceSearchHit } from '../types';

interface Props {
  citations: { id: number; rule_reference: string }[];
  // Citations registered for the case that do not appear in the box text
  // (SPEC-023 RF-011). Computed by the caller, which owns the text.
  missing: string[];
  hasText: boolean;
  onInsert: (text: string) => void;
  onInsertMissing: () => void;
  onAddCitation: (text: string) => Promise<void>;
  onRemoveCitation: (id: number) => Promise<void>;
}

// SPEC-023 — left side of the Rules Applicable box: registered citations
// (click to put one into the text box), the manual citation field, and the
// read-only corpus search. Nothing reaches the text box without a click
// (constitution). No phrases / examples here: those stay on the four
// phrase boxes (the phrase table only knows those four).
export function RulesSuggestions({
  citations,
  missing,
  hasText,
  onInsert,
  onInsertMissing,
  onAddCitation,
  onRemoveCitation,
}: Props) {
  const [ruleText, setRuleText] = useState('');
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<ResourceSearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  // The corpus index is per document, not per numbered rule, so this finds
  // the right document and snippet; the exact reference is still typed by
  // hand (until rules can be added from the corpus).
  useEffect(() => {
    if (!query.trim()) {
      setHits([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const handle = setTimeout(() => {
      api
        .searchResources(query.trim())
        .then((rows) => {
          if (!cancelled) setHits(rows);
        })
        .catch(() => {
          if (!cancelled) setHits([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!ruleText.trim()) return;
    await onAddCitation(ruleText.trim());
    setRuleText('');
  }

  return (
    <div className="suggestion-list">
      {hasText && missing.length > 0 && (
        <p className="rules-warning">
          {missing.length} cited {missing.length === 1 ? 'rule is' : 'rules are'} not in the text and will not
          appear in the document.{' '}
          <button type="button" onClick={onInsertMissing}>
            Insert missing
          </button>
        </p>
      )}

      <div className="suggestion-items">
        {citations.map((c) => (
          <div key={c.id} className="suggestion-row">
            <button
              type="button"
              className="suggestion-item"
              title={c.rule_reference}
              onClick={() => onInsert(c.rule_reference)}
            >
              {c.rule_reference}
            </button>
            <button type="button" aria-label={`Remove ${c.rule_reference}`} onClick={() => onRemoveCitation(c.id)}>
              Remove
            </button>
          </div>
        ))}
      </div>
      {citations.length === 0 && <p className="muted">No rules cited yet.</p>}

      <form onSubmit={handleAdd} className="inline-form">
        <input
          placeholder="e.g. RRS 18.2(b)"
          value={ruleText}
          onChange={(e) => setRuleText(e.target.value)}
          required
        />
        <button type="submit">Add</button>
      </form>

      <div className="rule-picker">
        <input
          placeholder="Search the loaded rules corpus (e.g. propulsion)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <p className="muted">Read-only until rules can be added from the corpus.</p>
        {searching && <p className="muted">Searching…</p>}
        {!searching && query.trim() !== '' && hits.length === 0 && (
          <p className="muted">No match in the loaded corpus. Upload it first (Upload rules, top nav).</p>
        )}
        <ul className="list">
          {hits.map((h) => (
            <li key={h.id}>
              <strong>{h.title}</strong> <span className="muted">({h.layer})</span>
              <br />
              <span className="muted">{h.snippet}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="muted">Cited rules save instantly. The text box saves with Save.</p>
    </div>
  );
}

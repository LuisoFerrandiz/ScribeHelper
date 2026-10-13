import { useEffect, useState } from 'react';
import { api } from '../api';
import type { SuggestionItem } from '../suggestionItems';
import { useExampleSuggestions } from '../useExampleSuggestions';
import type { PhraseBox, PhraseRow, PhraseSearchHit } from '../types';

interface Props {
  box: PhraseBox;
  currentText: string;
  onInsert: (text: string) => void;
  items: SuggestionItem[]; // case-derived, already ordered (SPEC-020 RF-006)
}

interface Entry {
  key: string;
  text: string; // inserted in full
  title: string; // tooltip
}

function matches(text: string, q: string): boolean {
  return text.toLowerCase().includes(q.toLowerCase());
}

function phraseEntry(p: PhraseRow): Entry {
  return { key: `phrase:${p.id}`, text: p.body, title: p.label ? `${p.label}\n\n${p.body}` : p.body };
}

// SPEC-020 — the single suggestion list of a writing box. Nothing is
// inserted without a click (constitution). Origin is internal data only:
// no sections, no labels. Case-derived items show by default; phrases
// appear on search or "Browse phrases"; examples on "Suggest from examples".
export function SuggestionList({ box, currentText, onInsert, items }: Props) {
  const [query, setQuery] = useState('');
  const [browsing, setBrowsing] = useState(false);
  const [browse, setBrowse] = useState<PhraseRow[]>([]);
  const [hits, setHits] = useState<PhraseSearchHit[]>([]);
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const examples = useExampleSuggestions(box);

  const q = query.trim();

  useEffect(() => {
    if (!browsing) return;
    let cancelled = false;
    api.listPhrases(box).then((rows) => {
      if (!cancelled) setBrowse(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [box, browsing]);

  useEffect(() => {
    if (!q) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      api.searchPhrases(box, q).then((rows) => {
        if (!cancelled) setHits(rows);
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [box, q]);

  async function handleSave() {
    if (!currentText.trim()) return;
    setSaving(true);
    try {
      await api.createPhrase({ box, label: label.trim(), body: currentText.trim() });
      setLabel('');
      if (browsing) setBrowse(await api.listPhrases(box));
    } finally {
      setSaving(false);
    }
  }

  const caseEntries: Entry[] = items
    .filter((it) => !q || matches(it.text, q))
    .map((it) => ({ key: it.id, text: it.text, title: it.text }));
  const phraseRows: PhraseRow[] = q ? hits : browsing ? browse : [];
  const phraseEntries = phraseRows.map(phraseEntry);
  const exampleEntries: Entry[] = (examples.phrases ?? [])
    .filter((t) => !q || matches(t, q))
    .map((t, i) => ({ key: `example:${i}`, text: t, title: t }));
  const entries = [...caseEntries, ...phraseEntries, ...exampleEntries];

  let message: string | null = null;
  if (entries.length === 0) {
    if (q || browsing || examples.phrases !== null) {
      message =
        browsing && !q && browse.length === 0 ? 'No phrases for this box yet.' : 'No matches.';
    } else {
      message = 'No suggestions from this case yet. Search or browse phrases, or suggest from examples.';
    }
  }

  return (
    <div className="suggestion-list">
      <input placeholder="Search suggestions…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="suggestion-actions">
        <button type="button" onClick={() => setBrowsing((b) => !b)} aria-pressed={browsing}>
          Browse phrases
        </button>
        <button type="button" onClick={examples.request} disabled={examples.loading}>
          {examples.loading ? 'Suggesting…' : examples.phrases === null ? 'Suggest from examples' : 'Refresh examples'}
        </button>
      </div>
      {examples.error && <p className="error">{examples.error}</p>}
      {examples.phrases !== null && examples.phrases.length === 0 && !examples.error && (
        <p className="muted">No usable suggestions from examples.</p>
      )}
      <div className="suggestion-items">
        {entries.map((e) => (
          <button key={e.key} type="button" className="suggestion-item" title={e.title} onClick={() => onInsert(e.text)}>
            {e.text}
          </button>
        ))}
      </div>
      {message && <p className="muted">{message}</p>}
      <div className="inline-form">
        <input placeholder="Label (optional)" value={label} onChange={(e) => setLabel(e.target.value)} />
        <button type="button" onClick={handleSave} disabled={saving || !currentText.trim()}>
          Save current text as phrase
        </button>
      </div>
    </div>
  );
}

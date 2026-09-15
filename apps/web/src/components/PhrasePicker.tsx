import { useEffect, useState } from 'react';
import { api } from '../api';
import type { PhraseBox, PhraseRow, PhraseSearchHit } from '../types';

interface Props {
  box: PhraseBox;
  currentText: string;
  onInsert: (body: string) => void;
}

// Phase 2 phrase library (CONTEXT.md section 6, D-022): browse/search
// reusable wording for this box, insert it, or save the box's current
// text as a new phrase of your own. Deterministic — no AI.
export function PhrasePicker({ box, currentText, onInsert }: Props) {
  const [query, setQuery] = useState('');
  const [browse, setBrowse] = useState<PhraseRow[]>([]);
  const [hits, setHits] = useState<PhraseSearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) api.listPhrases(box).then(setBrowse);
  }, [box, open]);

  useEffect(() => {
    if (!query.trim()) {
      setHits([]);
      return;
    }
    const handle = setTimeout(() => {
      api.searchPhrases(box, query.trim()).then(setHits);
    }, 300);
    return () => clearTimeout(handle);
  }, [box, query]);

  async function handleSave() {
    if (!currentText.trim()) return;
    setSaving(true);
    try {
      await api.createPhrase({ box, label: label.trim(), body: currentText.trim() });
      setLabel('');
      if (open) setBrowse(await api.listPhrases(box));
    } finally {
      setSaving(false);
    }
  }

  const shown = query.trim() ? hits : browse;

  return (
    <div className="phrase-picker">
      <button type="button" onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide phrases' : 'Phrases'}
      </button>
      {open && (
        <div className="phrase-picker-panel">
          <input
            placeholder="Search phrases…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ul className="list">
            {shown.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => onInsert(p.body)}>
                  {p.label || p.body.slice(0, 40)}
                </button>
                {p.origin === 'own' && <span className="muted"> (own)</span>}
              </li>
            ))}
            {shown.length === 0 && <li className="muted">No phrases for this box yet.</li>}
          </ul>
          <div className="inline-form">
            <input
              placeholder="Label (optional)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <button type="button" onClick={handleSave} disabled={saving || !currentText.trim()}>
              Save current text as phrase
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

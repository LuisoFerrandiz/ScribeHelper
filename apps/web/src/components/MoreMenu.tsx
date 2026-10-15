import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { ftsQuery } from '../ftsQuery';
import { useExampleSuggestions } from '../useExampleSuggestions';
import type { PhraseBox, PhraseRow } from '../types';

interface Props {
  box: PhraseBox;
  currentText: string;
  // The text selected in the box ('' when none): "Save as phrase" saves it, or the whole box.
  getSelectedText: () => string;
  onInsert: (text: string) => void;
  onPhraseSaved: () => void;
}

function matches(text: string, q: string): boolean {
  return text.toLowerCase().includes(q.toLowerCase());
}

// SPEC-034 RF-016..RF-019 — the secondary tools of a writing box, out of sight until asked
// for: search the phrase library, browse it, suggest from examples, save as phrase. A result
// is the whole text; a click inserts it at the caret and closes the menu.
export function MoreMenu({ box, currentText, getSelectedText, onInsert, onPhraseSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [browsing, setBrowsing] = useState(false);
  const [browse, setBrowse] = useState<PhraseRow[]>([]);
  const [hits, setHits] = useState<PhraseRow[]>([]);
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [source, setSource] = useState<'Selection' | 'Whole box'>('Whole box');
  const examples = useExampleSuggestions(box);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  const q = query.trim();
  const fts = ftsQuery(q);

  // RF-017: Escape closes this menu first (captured before the box sees it) and gives the
  // focus back to the button; a click outside closes it too.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
      button.current?.focus();
    }
    function onDown(e: MouseEvent) {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !browsing) return;
    let cancelled = false;
    api
      .listPhrases(box)
      .then((rows) => {
        if (!cancelled) setBrowse(rows);
      })
      .catch(() => {
        if (!cancelled) setBrowse([]);
      });
    return () => {
      cancelled = true;
    };
  }, [box, open, browsing]);

  useEffect(() => {
    if (!fts) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      api
        .searchPhrases(box, fts)
        .then((rows) => {
          if (!cancelled) setHits(rows);
        })
        .catch(() => {
          if (!cancelled) setHits([]);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [box, fts]);

  function toggle() {
    if (!open) {
      setSource(getSelectedText() ? 'Selection' : 'Whole box');
      setSaved(false);
    }
    setOpen((o) => !o);
  }

  function insert(text: string) {
    onInsert(text);
    setOpen(false);
  }

  async function handleSave() {
    const selected = getSelectedText();
    const body = (selected || currentText).trim();
    if (!body) return;
    setSaving(true);
    try {
      await api.createPhrase({ box, label: label.trim(), body });
      setLabel('');
      setSaved(true);
      if (browsing) setBrowse(await api.listPhrases(box));
      onPhraseSaved();
    } finally {
      setSaving(false);
    }
  }

  const phraseRows: PhraseRow[] = q ? hits : browsing ? browse : [];
  const exampleTexts = (examples.phrases ?? []).filter((t) => !q || matches(t, q));
  const results = [
    ...phraseRows.map((p) => ({ key: `phrase:${p.id}`, text: p.body })),
    ...exampleTexts.map((t, i) => ({ key: `example:${i}`, text: t })),
  ];

  let message: string | null = null;
  if (results.length === 0) {
    if (q || browsing || examples.phrases !== null) {
      message = browsing && !q && browse.length === 0 ? 'No phrases for this box yet.' : 'No matches.';
    }
  }

  return (
    <div
      className="more-menu-wrap"
      ref={wrap}
      onBlur={(e) => {
        // Tab (or a click) that leaves the menu closes it; losing the whole window does not.
        const next = e.relatedTarget as Node | null;
        if (open && next && !wrap.current?.contains(next)) setOpen(false);
      }}
    >
      <button
        type="button"
        ref={button}
        aria-haspopup="menu"
        aria-expanded={open}
        data-gap-ui
        onMouseDown={(e) => e.preventDefault()}
        onClick={toggle}
      >
        More
      </button>
      {open && (
        <div className="more-menu" role="menu">
          <input
            placeholder="Search suggestions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-gap-ui
            autoFocus
          />
          <div className="more-menu-actions">
            <button type="button" data-gap-ui onClick={() => setBrowsing((b) => !b)} aria-pressed={browsing}>
              Browse phrases
            </button>
            <button type="button" data-gap-ui onClick={examples.request} disabled={examples.loading}>
              {examples.loading ? 'Suggesting…' : examples.phrases === null ? 'Suggest from examples' : 'Refresh examples'}
            </button>
          </div>
          {examples.error && <p className="error">{examples.error}</p>}
          {examples.phrases !== null && examples.phrases.length === 0 && !examples.error && (
            <p className="muted">No usable suggestions from examples.</p>
          )}
          <div className="more-menu-results">
            {results.map((r) => (
              <button
                key={r.key}
                type="button"
                className="proposal-card"
                role="menuitem"
                data-gap-ui
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insert(r.text)}
              >
                {r.text}
              </button>
            ))}
          </div>
          {message && <p className="muted">{message}</p>}
          <div className="more-menu-save">
            <input placeholder="Label (optional)" value={label} onChange={(e) => setLabel(e.target.value)} data-gap-ui />
            <button type="button" data-gap-ui onClick={handleSave} disabled={saving || !(getSelectedText() || currentText).trim()}>
              Save as phrase
            </button>
            <span className="muted">{saved ? 'Saved.' : source}</span>
          </div>
          <p className="muted">Use [brackets] for gaps and X / Y for the parties.</p>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { api } from '../api';
import type { ExampleSuggestionBox } from '../types';

interface Props {
  box: ExampleSuggestionBox;
  onInsert: (text: string) => void;
}

// SPEC-005/SPEC-006 — "AI suggestions" section of the panel, replacing
// "AI draft" for the boxes this source supports. Mounted only while its
// section is expanded (same pattern as AIDraftPanel.tsx): fetches once
// on mount, re-fetches if the section is collapsed and reopened.
export function ExamplePhraseSuggestions({ box, onInsert }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phrases, setPhrases] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .suggestPhrasesFromExamples(box)
      .then((result) => {
        if (!cancelled) setPhrases(result.phrases);
      })
      .catch((e) => {
        if (!cancelled) {
          setError((e as Error).message);
          setPhrases([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [box]);

  return (
    <div className="example-phrase-suggestions">
      {loading && <p className="muted">Looking through examples…</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && phrases.length === 0 && (
        <p className="muted">No usable phrases found in the accepted examples.</p>
      )}
      <div className="suggestions-lines">
        {phrases.map((phrase, i) => (
          <button key={i} type="button" onClick={() => onInsert(phrase)}>
            + {phrase}
          </button>
        ))}
      </div>
    </div>
  );
}

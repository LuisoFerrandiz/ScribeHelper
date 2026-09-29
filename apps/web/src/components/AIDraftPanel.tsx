import { useEffect, useState } from 'react';
import { api } from '../api';
import type { DraftResult, PhraseBox } from '../types';

interface Props {
  caseId: number;
  box: PhraseBox;
  currentText: string;
  onInsert: (body: string) => void;
}

// Phase 4 (CONTEXT.md section 9): alternative draft, one box at a time,
// grounded in this case's other saved data (apps/api/src/ai/draft.ts)
// plus whatever is currently typed in this box (`currentText`) — sent on
// every request rather than read from the last-saved row, so drafting
// works on unsaved text instead of silently ignoring it. Every rule the
// model cites is checked against the accepted rule corpus and flagged
// here — nothing is inserted automatically (RULES.md R-34: AI suggestion
// comes last, the drafter always reviews before it lands in the box).
// Mounted only while its SuggestionsPanel section is expanded, so a
// draft is generated on mount; collapsing the section unmounts this
// panel, and expanding it again remounts and regenerates.
export function AIDraftPanel({ caseId, box, currentText, onInsert }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DraftResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .generateDraft(caseId, box, currentText)
      .then((r) => {
        if (!cancelled) setResult(r);
      })
      .catch((e) => {
        if (!cancelled) {
          setError((e as Error).message);
          setResult(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="ai-draft-panel-body">
      {loading && <p className="muted">Drafting…</p>}
      {error && <p className="error">{error}</p>}
      {result && (
        <div className="ai-draft-result">
          <pre className="resource-preview">{result.text || '(empty)'}</pre>
          {result.citations.length > 0 && (
            <ul className="list">
              {result.citations.map((c) => (
                <li key={c.reference} className={c.found ? undefined : 'error'}>
                  {c.found ? '✓' : '✗'} {c.reference}
                  {!c.found && ' — not found in the accepted rules corpus, verify before using'}
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={() => onInsert(result.text)} disabled={!result.text}>
            Insert
          </button>
        </div>
      )}
    </div>
  );
}

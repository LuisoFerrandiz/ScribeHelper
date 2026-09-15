import { useState } from 'react';
import { api } from '../api';
import type { DraftResult, PhraseBox } from '../types';

interface Props {
  caseId: number;
  box: PhraseBox;
  onInsert: (body: string) => void;
}

// Phase 4 (CONTEXT.md section 9): alternative draft, one box at a time,
// grounded in this case's own saved data (apps/api/src/ai/draft.ts).
// Every rule the model cites is checked against the accepted rule corpus
// and flagged here — nothing is inserted automatically (RULES.md R-34:
// AI suggestion comes last, the drafter always reviews before it lands
// in the box).
export function AIDraftPanel({ caseId, box, onInsert }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DraftResult | null>(null);

  async function handleToggle() {
    if (open) {
      setOpen(false);
      return;
    }
    // One button does both jobs — opening the panel generates the draft
    // straight away, closing and reopening regenerates it. No separate
    // "generate" button to press first.
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      setResult(await api.generateDraft(caseId, box));
    } catch (e) {
      setError((e as Error).message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ai-draft-panel">
      <button type="button" onClick={handleToggle} disabled={loading}>
        {loading ? 'Drafting…' : open ? 'Hide AI draft' : 'AI draft'}
      </button>
      {open && (
        <div className="ai-draft-panel-body">
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
      )}
    </div>
  );
}

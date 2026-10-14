import { useState } from 'react';
import { serverError } from '../api';
import type { RuleSearchHit } from '../types';

interface Props {
  hits: RuleSearchHit[];
  onAddSection: (sectionId: number) => Promise<void>;
}

const UNCLASSIFIED_REASON = 'Classify this document first (Upload rules)';

// SPEC-022 RF-005 — one numbered rule per row with its canonical citation and
// an Add button that registers it and writes it into the Rules Applicable
// text. Shared by the rule search (RulePicker) and the suggestions from Facts
// Found (SPEC-027).
export function RuleHitList({ hits, onAddSection }: Props) {
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(sectionId: number) {
    setError(null);
    try {
      await onAddSection(sectionId);
    } catch (e) {
      setError(serverError(e));
    }
  }

  return (
    <>
      {error && <p className="error">{error}</p>}
      <ul className="list">
        {hits.map((h) => (
          <li key={h.section_id}>
            <strong>{h.citation ?? h.heading}</strong> <span className="muted">{h.heading}</span>
            <br />
            <span className="muted">{h.doc_title}</span>
            {h.snippet && h.snippet !== h.heading && (
              <>
                <br />
                <span className="muted">{h.snippet}</span>
              </>
            )}
            <br />
            {h.cited ? (
              <span className="muted">Already cited</span>
            ) : (
              <button
                type="button"
                disabled={!h.can_add}
                title={h.can_add ? undefined : UNCLASSIFIED_REASON}
                onClick={() => handleAdd(h.section_id)}
              >
                Add
              </button>
            )}
            {!h.can_add && <span className="muted"> {UNCLASSIFIED_REASON}</span>}
          </li>
        ))}
      </ul>
    </>
  );
}

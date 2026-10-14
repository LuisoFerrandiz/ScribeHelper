import { useState, type FormEvent } from 'react';
import { serverError } from '../api';
import { RulePicker } from './RulePicker';

interface Props {
  caseId: number;
  citations: { id: number; rule_reference: string }[];
  // Citations registered for the case that do not appear in the box text
  // (SPEC-023 RF-011). Computed by the caller, which owns the text.
  missing: string[];
  hasText: boolean;
  onInsert: (text: string) => void;
  onInsertMissing: () => void;
  // SPEC-022: registers the citation (the server validates it against the
  // corpus) and writes it into the text box in one step. Rejects with the
  // server's message when the citation cannot be made.
  onAddCitation: (input: { text: string } | { section_id: number }) => Promise<void>;
  onRemoveCitation: (id: number) => Promise<void>;
}

// SPEC-023 / SPEC-022 — side of the Rules Applicable box: registered citations
// (click to put one into the text box), the typed citation field, and the
// corpus search whose results are added with one click. Nothing reaches the
// text box without a click (constitution). No phrases / examples here: those
// stay on the four phrase boxes (the phrase table only knows those four).
export function RulesSuggestions({
  caseId,
  citations,
  missing,
  hasText,
  onInsert,
  onInsertMissing,
  onAddCitation,
  onRemoveCitation,
}: Props) {
  const [ruleText, setRuleText] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!ruleText.trim()) return;
    setError(null);
    try {
      await onAddCitation({ text: ruleText.trim() });
      setRuleText('');
    } catch (err) {
      setError(serverError(err));
    }
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
          placeholder="e.g. RRS 18.2, NoR 1.9, SI 12"
          value={ruleText}
          onChange={(e) => setRuleText(e.target.value)}
          required
        />
        <button type="submit">Add</button>
      </form>
      {error && <p className="error">{error}</p>}

      <RulePicker
        caseId={caseId}
        citationsKey={citations.map((c) => c.id).join(',')}
        onAddSection={(section_id) => onAddCitation({ section_id })}
      />

      <p className="muted">Cited rules save instantly. The text box saves with Save.</p>
    </div>
  );
}

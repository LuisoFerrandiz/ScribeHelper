import { useEffect, useState, type FormEvent } from 'react';
import { api, serverError } from '../api';
import type { RuleSearchResult } from '../types';
import { RuleHitList } from './RuleHitList';
import { RulePicker } from './RulePicker';

interface Props {
  caseId: number;
  citations: { id: number; rule_reference: string }[];
  // Citations registered for the case that do not appear in the box text
  // (SPEC-023 RF-011). Computed by the caller, which owns the text.
  missing: string[];
  hasText: boolean;
  factsText: string; // Facts Found as on screen, saved or not (SPEC-027)
  rulesText: string; // Rules Applicable text as on screen (SPEC-028)
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
  factsText,
  rulesText,
  onInsert,
  onInsertMissing,
  onAddCitation,
  onRemoveCitation,
}: Props) {
  const [ruleText, setRuleText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // SPEC-027: rules suggested from the Facts Found text. A click makes a new
  // request object (so a repeat click re-asks); it is also re-sent when the
  // registered citations change, so "Already cited" refreshes after an Add.
  // The answer of an older request is dropped (cancelled).
  const [request, setRequest] = useState<{ text: string } | null>(null);
  const [suggested, setSuggested] = useState<RuleSearchResult | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const citationsKey = citations.map((c) => c.id).join(',');

  useEffect(() => {
    if (request === null) return;
    let cancelled = false;
    setSuggesting(true);
    setSuggestError(null);
    api
      .suggestRules(caseId, request.text)
      .then((r) => {
        if (!cancelled) setSuggested(r);
      })
      .catch((e) => {
        if (!cancelled) setSuggestError(serverError(e));
      })
      .finally(() => {
        if (!cancelled) setSuggesting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [request, caseId, citationsKey]);

  // SPEC-028: typed references the loaded rules do not contain. Informative
  // only. Debounced; the answer of an older text is dropped; no stale warning
  // is left on an empty text, a failed call or another case.
  const [unresolved, setUnresolved] = useState<string[]>([]);
  useEffect(() => {
    if (!rulesText.trim()) {
      setUnresolved([]);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      api
        .checkRuleRefs(caseId, rulesText)
        .then((r) => {
          if (!cancelled) setUnresolved(r.unresolved);
        })
        .catch(() => {
          if (!cancelled) setUnresolved([]);
        });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [rulesText, caseId]);

  function handleSuggest() {
    setSuggested(null);
    setRequest({ text: factsText });
  }

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

      {unresolved.length > 0 && (
        <p className="rules-warning">
          Not found in the loaded rules: {unresolved.join(', ')}. Check them or load the document.
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

      <div className="rule-suggest">
        <button type="button" onClick={handleSuggest} disabled={!factsText.trim() || suggesting}>
          {suggesting ? 'Searching…' : 'Suggest from Facts Found'}
        </button>
        {suggestError && <p className="error">{suggestError}</p>}
        {!suggesting && !suggestError && suggested && suggested.hits.length === 0 && (
          <p className="muted">No rules matched the Facts Found text.</p>
        )}
        {suggested && suggested.hits.length > 0 && (
          <RuleHitList hits={suggested.hits} onAddSection={(section_id) => onAddCitation({ section_id })} />
        )}
        <p className="muted">Keyword match against the loaded rules; you decide which apply.</p>
      </div>

      <RulePicker
        caseId={caseId}
        citationsKey={citations.map((c) => c.id).join(',')}
        onAddSection={(section_id) => onAddCitation({ section_id })}
      />

      <p className="muted">Cited rules save instantly. The text box saves with Save.</p>
    </div>
  );
}

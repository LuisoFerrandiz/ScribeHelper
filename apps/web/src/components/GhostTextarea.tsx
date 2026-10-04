import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { api } from '../api';
import type { PhraseBox } from '../types';

interface SailNumberRole {
  sailNumber: string;
  role: 'initiator' | 'respondent';
}

interface Props {
  caseId: number;
  box: PhraseBox;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  // SPEC-006 RF-005, Facts Found only: a deterministic completion
  // checked before the AI one — no network, no debounce, cheaper and
  // faster since the case already has these two sail numbers in memory.
  sailNumberRoles?: SailNumberRole[];
}

const DEBOUNCE_MS = 900;
const MIN_CHARS = 15;

// `value` ends with `sailNumber` and that match starts at a word
// boundary (string start, or the preceding char isn't alphanumeric) —
// so typing "ITA 32004" matches but "SITA 32004" (mid-word) doesn't.
function endsWithSailNumber(value: string, sailNumber: string): boolean {
  if (!sailNumber || !value.endsWith(sailNumber)) return false;
  const beforeIndex = value.length - sailNumber.length - 1;
  if (beforeIndex < 0) return true;
  return !/[a-z0-9]/i.test(value[beforeIndex]);
}

// Phase 5 (CONTEXT.md section 9, D-025): Copilot-style inline completion.
// A textarea can't render ghost text itself, so a same-sized mirror
// <div> sits behind it: the mirror's own text is transparent (the real
// textarea draws it on top, in the same font metrics), and only the
// suggestion appended after it is visible, in muted gray. Tab accepts
// it; typing, moving the cursor, or Escape drops it.
export function GhostTextarea({ caseId, box, value, onChange, rows, sailNumberRoles }: Props) {
  const [suggestion, setSuggestion] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const requestId = useRef(0);

  useEffect(() => {
    setSuggestion('');
    const textarea = textareaRef.current;
    if (!textarea) return;
    if (textarea.selectionStart !== value.length || textarea.selectionEnd !== value.length) return;

    const sailMatch = sailNumberRoles?.find((r) => endsWithSailNumber(value, r.sailNumber));
    if (sailMatch) {
      setSuggestion(` (${sailMatch.role})`);
      return;
    }

    if (value.trim().length < MIN_CHARS) return;

    const thisRequest = ++requestId.current;
    const handle = setTimeout(() => {
      api
        .completeInline(caseId, box, value)
        .then((result) => {
          if (requestId.current === thisRequest) setSuggestion(result.suggestion);
        })
        .catch(() => {
          if (requestId.current === thisRequest) setSuggestion('');
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, caseId, box, sailNumberRoles]);

  function acceptSuggestion() {
    if (!suggestion) return;
    onChange(value + suggestion);
    setSuggestion('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (suggestion && e.key === 'Tab') {
      e.preventDefault();
      acceptSuggestion();
    } else if (suggestion && e.key === 'Escape') {
      setSuggestion('');
    }
  }

  return (
    <div className="ghost-textarea">
      <div className="ghost-textarea-mirror" aria-hidden="true">
        <span className="ghost-textarea-real">{value}</span>
        <span className="ghost-textarea-suggestion">{suggestion}</span>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onClick={() => setSuggestion('')}
        rows={rows}
      />
    </div>
  );
}

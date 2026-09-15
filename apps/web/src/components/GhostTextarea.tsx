import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { api } from '../api';
import type { PhraseBox } from '../types';

interface Props {
  caseId: number;
  box: PhraseBox;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}

const DEBOUNCE_MS = 900;
const MIN_CHARS = 15;

// Phase 5 (CONTEXT.md section 9, D-025): Copilot-style inline completion.
// A textarea can't render ghost text itself, so a same-sized mirror
// <div> sits behind it: the mirror's own text is transparent (the real
// textarea draws it on top, in the same font metrics), and only the
// suggestion appended after it is visible, in muted gray. Tab accepts
// it; typing, moving the cursor, or Escape drops it.
export function GhostTextarea({ caseId, box, value, onChange, rows }: Props) {
  const [suggestion, setSuggestion] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const requestId = useRef(0);

  useEffect(() => {
    setSuggestion('');
    const textarea = textareaRef.current;
    if (!textarea) return;
    if (value.trim().length < MIN_CHARS) return;
    if (textarea.selectionStart !== value.length || textarea.selectionEnd !== value.length) return;

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
  }, [value, caseId, box]);

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

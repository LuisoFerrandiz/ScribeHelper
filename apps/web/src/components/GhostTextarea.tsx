import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';
import { api } from '../api';
import { nextGap, normalizePhraseText, phraseGaps, prevGap, replaceParty } from '../phraseGaps';
import type { Range } from '../phraseGaps';
import { usePhraseCompletions } from '../usePhraseCompletions';
import type { ChainContext, PhraseBox, RulesBox } from '../types';
import { PartyBar } from './PartyBar';

interface SailNumberRole {
  sailNumber: string;
  role: 'initiator' | 'respondent';
}

interface Props {
  caseId: number;
  box: RulesBox;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  // SPEC-006 RF-005, Facts Found only: a deterministic completion
  // checked before the AI one — no network, no debounce, cheaper and
  // faster since the case already has these two sail numbers in memory.
  sailNumberRoles?: SailNumberRole[];
  // SPEC-025: the four boxes that use the phrase library. Turns on the ghost
  // text of stored phrases and the gap session; absent in Rules Applicable.
  phraseBox?: PhraseBox;
  phraseRefreshKey?: number; // changes when the user saves a phrase
  // Boats of the case, for the X / Y buttons of the party bar (SPEC-025 RF-005).
  parties?: SailNumberRole[];
  // SPEC-030: earlier boxes of the chain, read-only context for the AI ghost
  // text. Read when the request fires, so a change never re-fires it by itself.
  chain?: ChainContext;
}

export interface GhostTextareaHandle {
  // Insert a library phrase at the caret (SPEC-025 RF-002).
  insertAtCaret: (text: string) => void;
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

// Longest common prefix / suffix of two strings, used to find what an edit
// changed (the textarea only reports the new value).
function changedRegion(oldValue: string, newValue: string) {
  let p = 0;
  const max = Math.min(oldValue.length, newValue.length);
  while (p < max && oldValue[p] === newValue[p]) p++;
  let s = 0;
  while (s < max - p && oldValue[oldValue.length - 1 - s] === newValue[newValue.length - 1 - s]) s++;
  return { start: p, oldEnd: oldValue.length - s };
}

const CLOSING_INPUTS = ['insertFromPaste', 'deleteByCut', 'insertFromDrop', 'deleteByDrag', 'historyUndo', 'historyRedo'];

// Phase 5 (CONTEXT.md section 9, D-025): Copilot-style inline completion.
// A textarea can't render ghost text itself, so a same-sized mirror
// <div> sits behind it: the mirror's own text is transparent (the real
// textarea draws it on top, in the same font metrics), and only the
// suggestion appended after it is visible, in muted gray. Tab accepts
// it; typing, moving the cursor, or Escape drops it.
//
// SPEC-025: phrases of the library carry gaps in [brackets]. After a phrase is
// inserted (or accepted from the ghost text) the box opens a gap session over
// the inserted text ("zone"): the first gap is selected, Tab / Shift+Tab walk
// the gaps, and X / Y labels are resolved with the party bar.
export const GhostTextarea = forwardRef<GhostTextareaHandle, Props>(function GhostTextarea(
  { caseId, box, value, onChange, rows, sailNumberRoles, phraseBox, phraseRefreshKey, parties, chain },
  ref,
) {
  const [suggestion, setSuggestion] = useState('');
  const suggestionIsPhrase = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const requestId = useRef(0);
  const completePhrase = usePhraseCompletions(phraseBox, phraseRefreshKey);

  // Gap session. State drives the hint and the party bar; the ref lets event
  // handlers read the latest zone without waiting for a render.
  const [zone, setZoneState] = useState<Range | null>(null);
  const zoneRef = useRef<Range | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const chainRef = useRef(chain);
  chainRef.current = chain;
  const touched = useRef(false);
  const pendingSelection = useRef<Range | null>(null);
  const ignoreBlur = useRef(false);

  function setZone(z: Range | null) {
    zoneRef.current = z;
    setZoneState(z);
  }

  function select(start: number, end: number) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    ignoreBlur.current = true;
    textarea.focus();
    textarea.setSelectionRange(start, end);
    // Focusing again after the selection makes the browser scroll it into view.
    textarea.blur();
    textarea.focus();
    textarea.setSelectionRange(start, end);
    ignoreBlur.current = false;
  }

  // Applies a selection requested together with a value change, after React
  // has put the new value in the textarea.
  useLayoutEffect(() => {
    const z = zoneRef.current;
    if (z && z.end > value.length) setZone(null);
    const sel = pendingSelection.current;
    if (sel) {
      pendingSelection.current = null;
      select(sel.start, sel.end);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Opens a session over [start, start + text.length). `text` is what was
  // inserted; the first gap (or, with only party labels, the end of the text)
  // is selected once the value is rendered.
  function openZone(start: number, text: string) {
    const end = start + text.length;
    const { gaps, parties: labels } = phraseGaps(text);
    if (gaps.length === 0 && labels.length === 0) {
      setZone(null);
      pendingSelection.current = { start: end, end };
      return;
    }
    setZone({ start, end });
    pendingSelection.current = gaps.length > 0 ? { start: start + gaps[0].start, end: start + gaps[0].end } : { start: end, end };
  }

  useImperativeHandle(ref, () => ({
    insertAtCaret(raw: string) {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const text = normalizePhraseText(raw);
      const current = valueRef.current;
      const atEnd =
        !touched.current ||
        (textarea.selectionStart === current.length && textarea.selectionEnd === current.length);
      let next: string;
      let start: number;
      if (atEnd) {
        const separator = current ? '\n\n' : '';
        start = current.length + separator.length;
        next = current + separator + text;
      } else {
        start = textarea.selectionStart;
        next = current.slice(0, start) + text + current.slice(textarea.selectionEnd);
      }
      setSuggestion('');
      openZone(start, text);
      onChange(next);
    },
  }));

  useEffect(() => {
    setSuggestion('');
    suggestionIsPhrase.current = false;
    const textarea = textareaRef.current;
    if (!textarea) return;
    if (textarea.selectionStart !== value.length || textarea.selectionEnd !== value.length) return;

    const sailMatch = sailNumberRoles?.find((r) => endsWithSailNumber(value, r.sailNumber));
    if (sailMatch) {
      setSuggestion(` (${sailMatch.role})`);
      return;
    }

    // SPEC-025 RF-007: a stored phrase beats the AI (deterministic, offline).
    if (phraseBox) {
      const rest = completePhrase(value);
      if (rest) {
        suggestionIsPhrase.current = true;
        setSuggestion(rest);
        return;
      }
    }

    if (value.trim().length < MIN_CHARS) return;

    const thisRequest = ++requestId.current;
    const handle = setTimeout(() => {
      api
        .completeInline(caseId, box, value, chainRef.current)
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
    if (suggestionIsPhrase.current) openZone(value.length, suggestion);
    onChange(value + suggestion);
    setSuggestion('');
  }

  // Tab / Shift+Tab inside a session (SPEC-025 RF-003). Returns true when the
  // key was handled.
  function walkGaps(e: KeyboardEvent<HTMLTextAreaElement>): boolean {
    const z = zoneRef.current;
    const textarea = textareaRef.current;
    if (!z || !textarea) return false;
    if (textarea.selectionStart < z.start || textarea.selectionEnd > z.end) {
      setZone(null);
      return false;
    }
    const { gaps } = phraseGaps(valueRef.current.slice(z.start, z.end));
    const from = textarea.selectionStart - z.start;
    const to = textarea.selectionEnd - z.start;
    if (e.shiftKey) {
      const gap = prevGap(gaps, from);
      if (!gap) {
        setZone(null);
        return false;
      }
      select(z.start + gap.start, z.start + gap.end);
      return true;
    }
    const gap = nextGap(gaps, to);
    if (gap) {
      select(z.start + gap.start, z.start + gap.end);
    } else {
      select(z.end, z.end);
      setZone(null);
    }
    return true;
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (suggestion && e.key === 'Tab') {
      e.preventDefault();
      acceptSuggestion();
    } else if (suggestion && e.key === 'Escape') {
      setSuggestion('');
    } else if (zoneRef.current && e.key === 'Tab') {
      if (walkGaps(e)) e.preventDefault();
    } else if (zoneRef.current && e.key === 'Escape') {
      setZone(null);
    }
  }

  // Keeps the zone on the text it covers while the user types (SPEC-025
  // RF-004). Pasting, cutting, dropping and undo end the session.
  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    const z = zoneRef.current;
    if (z) {
      const inputType = (e.nativeEvent as InputEvent).inputType ?? '';
      const { start, oldEnd } = changedRegion(valueRef.current, next);
      const delta = next.length - valueRef.current.length;
      if (CLOSING_INPUTS.includes(inputType)) setZone(null);
      else if (oldEnd <= z.start) setZone({ start: z.start + delta, end: z.end + delta });
      else if (start >= z.end) {
        /* edit after the zone: nothing to do */
      } else if (start >= z.start && oldEnd <= z.end) setZone({ start: z.start, end: z.end + delta });
      else setZone(null);
    }
    onChange(next);
  }

  function handleBlur(e: FocusEvent<HTMLTextAreaElement>) {
    if (ignoreBlur.current) return;
    if ((e.relatedTarget as HTMLElement | null)?.closest('[data-gap-ui]')) return;
    setZone(null);
  }

  function handleReplaceParty(label: 'X' | 'Y', sailNumber: string) {
    const z = zoneRef.current;
    if (!z) return;
    const current = valueRef.current;
    const zoneText = replaceParty(current.slice(z.start, z.end), label, sailNumber);
    const nextZone = { start: z.start, end: z.start + zoneText.length };
    const { gaps, parties: remaining } = phraseGaps(zoneText);
    // Nothing left to resolve in the zone: the session is over.
    setZone(gaps.length === 0 && remaining.length === 0 ? null : nextZone);
    pendingSelection.current = gaps.length
      ? { start: nextZone.start + gaps[0].start, end: nextZone.start + gaps[0].end }
      : { start: nextZone.end, end: nextZone.end };
    onChange(current.slice(0, z.start) + zoneText + current.slice(z.end));
  }

  const zoneLabels = zone ? phraseGaps(value.slice(zone.start, zone.end)).parties : [];
  const hasX = zoneLabels.some((p) => p.label === 'X' || p.label === 'XY');
  const hasY = zoneLabels.some((p) => p.label === 'Y' || p.label === 'XY');

  return (
    <>
      <div className="ghost-textarea">
        <div className="ghost-textarea-mirror" aria-hidden="true">
          <span className="ghost-textarea-real">{value}</span>
          <span className="ghost-textarea-suggestion">{suggestion}</span>
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            touched.current = true;
          }}
          onBlur={handleBlur}
          onClick={() => {
            setSuggestion('');
            setZone(null);
          }}
          rows={rows}
        />
      </div>
      {zone && (
        <p className="muted gap-hint" data-gap-ui>
          Tab: next gap · Shift+Tab: previous · Esc: stop
        </p>
      )}
      {zone && parties && (
        <PartyBar parties={parties} hasX={hasX} hasY={hasY} onReplace={handleReplaceParty} />
      )}
    </>
  );
});


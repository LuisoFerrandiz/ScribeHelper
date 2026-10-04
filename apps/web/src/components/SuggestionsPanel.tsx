import { useState, type ReactNode } from 'react';
import { AIDraftPanel } from './AIDraftPanel';
import { ExamplePhraseSuggestions } from './ExamplePhraseSuggestions';
import { PhrasePicker } from './PhrasePicker';
import type { ExampleSuggestionBox, PhraseBox } from '../types';

// Boxes with the "mine examples/" source instead of "AI draft".
// Deliberately only procedural_matters (SPEC-005) — the backend
// function/route are already generic for 'facts_found' too, but that
// box stays on AIDraftPanel until SPEC-006 actually ships, since its
// own RF-005/RF-006 (sail number autocomplete, live party reference)
// are meant to land alongside this source switch, not before it.
const EXAMPLE_SUGGESTION_BOXES: ExampleSuggestionBox[] = ['procedural_matters'];

function isExampleSuggestionBox(box: PhraseBox): box is ExampleSuggestionBox {
  return (EXAMPLE_SUGGESTION_BOXES as PhraseBox[]).includes(box);
}

interface ProtestFormSuggestion {
  lines?: string[];
  paragraph?: { label: string; text: string };
}

interface Props {
  caseId: number;
  box: PhraseBox;
  currentText: string;
  onInsert: (text: string) => void;
  protestForm?: ProtestFormSuggestion;
}

function CollapsibleSection({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="suggestions-section">
      <button
        type="button"
        className="suggestions-section-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="suggestions-section-chevron">{open ? '▾' : '▸'}</span> {title}
      </button>
      {open && <div className="suggestions-section-body">{children}</div>}
    </div>
  );
}

// Right-hand sidebar for a writing box: three independently collapsible
// sources of insertable text — suggestions pulled from the uploaded
// protest form (if any), the saved phrase library, and an AI draft.
// Every insert here is one click the drafter chooses to make; nothing
// lands in the box on its own (RULES.md R-06/R-07).
export function SuggestionsPanel({ caseId, box, currentText, onInsert, protestForm }: Props) {
  const hasProtestForm = !!protestForm && (!!protestForm.lines?.length || !!protestForm.paragraph);

  return (
    <div className="suggestions-panel">
      {hasProtestForm && (
        <CollapsibleSection title="Protest form">
          <div className="suggestions-lines">
            {protestForm!.lines?.map((line, i) => (
              <button key={i} type="button" onClick={() => onInsert(line)}>
                + {line}
              </button>
            ))}
            {protestForm!.paragraph && (
              <button type="button" onClick={() => onInsert(protestForm!.paragraph!.text)}>
                + {protestForm!.paragraph.label}
              </button>
            )}
          </div>
        </CollapsibleSection>
      )}
      <CollapsibleSection title="Phrases">
        <PhrasePicker box={box} currentText={currentText} onInsert={onInsert} />
      </CollapsibleSection>
      {isExampleSuggestionBox(box) ? (
        <CollapsibleSection title="AI suggestions">
          <ExamplePhraseSuggestions box={box} onInsert={onInsert} />
        </CollapsibleSection>
      ) : (
        <CollapsibleSection title="AI draft">
          <AIDraftPanel caseId={caseId} box={box} currentText={currentText} onInsert={onInsert} />
        </CollapsibleSection>
      )}
    </div>
  );
}

import { useState, type ReactNode } from 'react';
import { AIDraftPanel } from './AIDraftPanel';
import { ExamplePhraseSuggestions } from './ExamplePhraseSuggestions';
import { PartyReference } from './PartyReference';
import { PhrasePicker } from './PhrasePicker';
import type { ExampleSuggestionBox, PhraseBox } from '../types';

// Boxes with the "mine examples/" source instead of "AI draft" —
// procedural_matters (SPEC-005), facts_found (SPEC-006, shipped
// alongside its own RF-005/RF-006: sail number autocomplete and the
// live party reference, both in CaseForm.tsx/below).
const EXAMPLE_SUGGESTION_BOXES: ExampleSuggestionBox[] = ['procedural_matters', 'facts_found', 'conclusion', 'decision'];

function isExampleSuggestionBox(box: PhraseBox): box is ExampleSuggestionBox {
  return (EXAMPLE_SUGGESTION_BOXES as PhraseBox[]).includes(box);
}

interface ProtestFormSuggestion {
  lines?: string[];
  paragraph?: { label: string; text: string };
}

interface PartyReferenceData {
  initiators: { sailNumber: string; boatName: string }[];
  respondents: { sailNumber: string; boatName: string }[];
  race?: string;
}

interface Props {
  caseId: number;
  box: PhraseBox;
  currentText: string;
  onInsert: (text: string) => void;
  protestForm?: ProtestFormSuggestion;
  notesForm?: ProtestFormSuggestion; // SPEC-017: same shape, sourced from hearing notes
  // SPEC-006 RF-006, Facts Found only: always-visible party reference,
  // not one of the three collapsible sources below.
  partyReference?: PartyReferenceData;
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
export function SuggestionsPanel({ caseId, box, currentText, onInsert, protestForm, notesForm, partyReference }: Props) {
  const hasProtestForm = !!protestForm && (!!protestForm.lines?.length || !!protestForm.paragraph);
  const hasNotesForm = !!notesForm && (!!notesForm.lines?.length || !!notesForm.paragraph);

  return (
    <div className="suggestions-panel">
      {partyReference && (
        <PartyReference
          initiators={partyReference.initiators}
          respondents={partyReference.respondents}
          race={partyReference.race}
          currentText={currentText}
        />
      )}
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
      {hasNotesForm && (
        <CollapsibleSection title="Hearing notes">
          <div className="suggestions-lines">
            {notesForm!.lines?.map((line, i) => (
              <button key={i} type="button" onClick={() => onInsert(line)}>
                + {line}
              </button>
            ))}
            {notesForm!.paragraph && (
              <button type="button" onClick={() => onInsert(notesForm!.paragraph!.text)}>
                + {notesForm!.paragraph.label}
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

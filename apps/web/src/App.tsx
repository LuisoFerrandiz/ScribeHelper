import { useState } from 'react';
import { CaseForm } from './components/CaseForm';
import { CaseSelector } from './components/CaseSelector';
import { JuryPanel } from './components/JuryPanel';
import { ResourceUpload } from './components/ResourceUpload';

type Tab = 'case' | 'jury' | 'upload-examples' | 'upload-rules';

// Case screen is the app's entry point (D-018): pick or create a regatta
// and case from the top selector, no separate Events list. Jury and
// resource uploads are utilities reached from the top nav, scoped to
// whichever regatta is currently selected.
export function App() {
  const [tab, setTab] = useState<Tab>('case');
  const [currentEventId, setCurrentEventId] = useState<number | null>(null);
  const [currentCaseId, setCurrentCaseId] = useState<number | null>(null);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Scribe Helper</h1>
        <nav>
          <button type="button" onClick={() => setTab('case')} disabled={tab === 'case'}>
            Case
          </button>
          <button
            type="button"
            onClick={() => setTab('jury')}
            disabled={tab === 'jury' || currentEventId === null}
          >
            Jury
          </button>
          <button type="button" onClick={() => setTab('upload-examples')} disabled={tab === 'upload-examples'}>
            Upload examples
          </button>
          <button type="button" onClick={() => setTab('upload-rules')} disabled={tab === 'upload-rules'}>
            Upload rules
          </button>
        </nav>
      </header>

      {tab === 'case' && (
        <>
          <CaseSelector
            eventId={currentEventId}
            caseId={currentCaseId}
            onSelect={(eventId, caseId) => {
              setCurrentEventId(eventId);
              setCurrentCaseId(caseId);
            }}
          />
          {currentCaseId !== null ? (
            <CaseForm caseId={currentCaseId} />
          ) : (
            <p className="muted">Pick or create a regatta and case above.</p>
          )}
        </>
      )}

      {tab === 'jury' && currentEventId !== null && <JuryPanel eventId={currentEventId} />}

      {tab === 'upload-examples' && <ResourceUpload kind="example" eventId={currentEventId} />}
      {tab === 'upload-rules' && <ResourceUpload kind="rule" eventId={currentEventId} />}
    </div>
  );
}

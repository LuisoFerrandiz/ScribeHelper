import { useState } from 'react';
import { EventList } from './components/EventList';
import { EventDetail } from './components/EventDetail';
import { CaseForm } from './components/CaseForm';
import { CaseSelector } from './components/CaseSelector';

type View =
  | { name: 'events' }
  | { name: 'event'; eventId: number }
  | { name: 'case'; caseId: number; eventId: number };

export function App() {
  const [view, setView] = useState<View>({ name: 'events' });

  return (
    <div className="app">
      <header className="app-header">
        <h1>Scribe Helper</h1>
        <nav>
          {view.name !== 'events' && (
            <button type="button" onClick={() => setView({ name: 'events' })}>
              ← Events
            </button>
          )}
          {view.name === 'case' && (
            <button type="button" onClick={() => setView({ name: 'event', eventId: view.eventId })}>
              ← Cases
            </button>
          )}
        </nav>
      </header>

      {view.name === 'events' && <EventList onOpen={(eventId) => setView({ name: 'event', eventId })} />}
      {view.name === 'event' && (
        <EventDetail
          eventId={view.eventId}
          onOpenCase={(caseId) => setView({ name: 'case', caseId, eventId: view.eventId })}
        />
      )}
      {view.name === 'case' && (
        <>
          <CaseSelector
            eventId={view.eventId}
            caseId={view.caseId}
            onSelect={(eventId, caseId) => setView({ name: 'case', caseId, eventId })}
          />
          <CaseForm caseId={view.caseId} />
        </>
      )}
    </div>
  );
}

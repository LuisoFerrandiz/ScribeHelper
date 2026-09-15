import { useEffect, useState } from 'react';
import { api } from '../api';
import type { CaseRow, EventRow } from '../types';

interface Props {
  eventId: number;
  caseId: number;
  onSelect: (eventId: number, caseId: number) => void;
}

// Quick regatta/case switcher shown at the top of the case form. Typing an
// existing name/number (shown via datalist) selects it; typing a new one
// auto-creates it — D-018.
export function CaseSelector({ eventId, caseId, onSelect }: Props) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [allCases, setAllCases] = useState<CaseRow[]>([]);
  const [eventName, setEventName] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.listEvents(), api.listCases()]).then(([evs, cs]) => {
      setEvents(evs);
      setAllCases(cs);
    });
  }, []);

  useEffect(() => {
    const current = events.find((e) => e.id === eventId);
    setEventName(current?.name ?? '');
    const currentCase = allCases.find((c) => c.id === caseId);
    setCaseNumber(currentCase?.case_number ?? '');
  }, [eventId, caseId, events, allCases]);

  const matchedEvent = events.find((e) => e.name.toLowerCase() === eventName.trim().toLowerCase());
  const casesForEvent = matchedEvent ? allCases.filter((c) => c.event_id === matchedEvent.id) : [];

  async function handleGo() {
    if (!eventName.trim() || !caseNumber.trim()) return;
    setBusy(true);
    try {
      let event = events.find((e) => e.name.toLowerCase() === eventName.trim().toLowerCase());
      if (!event) {
        event = await api.createEvent({ name: eventName.trim(), venue: null, timezone: 'UTC' });
        setEvents((prev) => [...prev, event!]);
      }

      let theCase = allCases.find(
        (c) => c.event_id === event!.id && c.case_number.toLowerCase() === caseNumber.trim().toLowerCase(),
      );
      if (!theCase) {
        theCase = await api.createCase({
          event_id: event.id,
          case_number: caseNumber.trim(),
          day: null,
          race: null,
        });
        setAllCases((prev) => [...prev, theCase!]);
      }

      setError(null);
      onSelect(event.id, theCase.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="case-selector">
      <input
        list="selector-events"
        placeholder="Regatta"
        value={eventName}
        onChange={(e) => setEventName(e.target.value)}
      />
      <datalist id="selector-events">
        {events.map((e) => (
          <option key={e.id} value={e.name} />
        ))}
      </datalist>

      <input
        list="selector-cases"
        placeholder="Case #"
        value={caseNumber}
        onChange={(e) => setCaseNumber(e.target.value)}
      />
      <datalist id="selector-cases">
        {casesForEvent.map((c) => (
          <option key={c.id} value={c.case_number} />
        ))}
      </datalist>

      <button type="button" onClick={handleGo} disabled={busy}>
        Go
      </button>
      {error && <span className="error">{error}</span>}
    </div>
  );
}

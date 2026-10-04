import { useEffect, useRef, useState } from 'react';
import { api } from '../api';

interface Props {
  events: { id: number; name: string }[];
  existingCases: { event_id: number; case_number: string }[];
  onCreated: (eventId: number, caseId: number) => void;
  onClose: () => void;
}

const NEW_REGATTA = '__new__';

// SPEC-002: the only way to create a case. Native <dialog> — Escape and
// click-on-backdrop close it for free (RF-007), no hand-rolled overlay.
export function NewCaseDialog({ events, existingCases, onCreated, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [eventChoice, setEventChoice] = useState<string>(events.length === 0 ? '' : String(events[0].id));
  const [newEventName, setNewEventName] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function handleDialogClose() {
    onClose();
  }

  const creatingNewEvent = events.length === 0 || eventChoice === NEW_REGATTA;

  async function handleSubmit() {
    const regattaName = creatingNewEvent ? newEventName.trim() : events.find((e) => String(e.id) === eventChoice)?.name ?? '';
    const number = caseNumber.trim();
    if (!regattaName || !number) return;

    // Pre-check against what's already loaded — instant feedback; the
    // backend's UNIQUE(event_id, case_number) is the real authority
    // (handles the race two tabs could otherwise hit, RF-005).
    const targetEventId = creatingNewEvent ? null : Number(eventChoice);
    if (targetEventId !== null) {
      const dup = existingCases.some(
        (c) => c.event_id === targetEventId && c.case_number.toLowerCase() === number.toLowerCase(),
      );
      if (dup) {
        setError('A case with this number already exists in this regatta.');
        return;
      }
    }

    setBusy(true);
    setError(null);
    try {
      let eventId = targetEventId;
      if (eventId === null) {
        const event = await api.createEvent({ name: regattaName, venue: null, timezone: 'UTC' });
        eventId = event.id;
      }
      const created = await api.createCase({
        event_id: eventId,
        case_number: number,
        day: null,
        race: null,
      });
      dialogRef.current?.close();
      onCreated(eventId, created.id);
    } catch (e) {
      const message = (e as Error).message;
      setError(message.includes('duplicate') ? 'A case with this number already exists in this regatta.' : message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="new-case-dialog" onClose={handleDialogClose}>
      <h2>New case</h2>
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <label>
          Regatta
          {events.length === 0 ? (
            <input value={newEventName} onChange={(e) => setNewEventName(e.target.value)} required autoFocus />
          ) : (
            <select value={eventChoice} onChange={(e) => setEventChoice(e.target.value)}>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
              <option value={NEW_REGATTA}>New regatta…</option>
            </select>
          )}
        </label>

        {events.length > 0 && creatingNewEvent && (
          <label>
            New regatta name
            <input value={newEventName} onChange={(e) => setNewEventName(e.target.value)} required autoFocus />
          </label>
        )}

        <label>
          Case number
          <input value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} required />
        </label>

        {error && <p className="error">{error}</p>}

        <div className="new-case-dialog-actions">
          <button type="button" onClick={() => dialogRef.current?.close()}>
            Cancel
          </button>
          <button type="submit" disabled={busy}>
            {busy ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </dialog>
  );
}

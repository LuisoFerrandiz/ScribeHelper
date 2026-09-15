import { useEffect, useState } from 'react';
import { api } from '../api';
import type { EventRow } from '../types';

interface Props {
  onOpen: (eventId: number) => void;
}

// Events are created from the Case screen's regatta picker (typing a new
// name auto-creates it there) — this screen is read-only, D-018.
export function EventList({ onOpen }: Props) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listEvents()
      .then(setEvents)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <h2>Events</h2>
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <ul className="list">
          {events.map((ev) => (
            <li key={ev.id}>
              <button type="button" onClick={() => onOpen(ev.id)}>
                {ev.name}
              </button>
              {ev.venue && <span className="muted"> — {ev.venue}</span>}
            </li>
          ))}
          {events.length === 0 && <li className="muted">No events yet. Create one from the Case screen.</li>}
        </ul>
      )}
    </div>
  );
}

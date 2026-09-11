import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import type { EventRow } from '../types';

interface Props {
  onOpen: (eventId: number) => void;
}

export function EventList({ onOpen }: Props) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [name, setName] = useState('');
  const [venue, setVenue] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      setEvents(await api.listEvents());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await api.createEvent({ name: name.trim(), venue: venue.trim() || null, timezone });
    setName('');
    setVenue('');
    await refresh();
  }

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
          {events.length === 0 && <li className="muted">No events yet.</li>}
        </ul>
      )}

      <h3>New event</h3>
      <form onSubmit={handleCreate} className="inline-form">
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="Venue" value={venue} onChange={(e) => setVenue(e.target.value)} />
        <input
          placeholder="Timezone (e.g. Europe/Madrid)"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
        />
        <button type="submit">Create</button>
      </form>
    </div>
  );
}

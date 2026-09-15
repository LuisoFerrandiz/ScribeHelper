import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import type { EventRow, PersonRow } from '../types';

interface Props {
  eventId: number;
}

interface PoolRow {
  id: number;
  full_name: string;
}

// The event's judge pool (D-021): added once per regatta, never per case.
// Which of these judges actually sit on a given hearing, and who chairs
// it, is chosen per case in CaseForm's Jury Members box — judges rotate
// between hearings, so that can't be fixed here for the whole event.
export function JuryPanel({ eventId }: Props) {
  const [event, setEvent] = useState<EventRow | null>(null);
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [pool, setPool] = useState<PoolRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [juryName, setJuryName] = useState('');

  async function refresh() {
    try {
      const [events, allPeople, allPool] = await Promise.all([
        api.listEvents(),
        api.listPeople(),
        api.listJuryMembers(),
      ]);
      setEvent(events.find((e) => e.id === eventId) ?? null);
      setPeople(allPeople);
      const nameById = new Map(allPeople.map((p) => [p.id, p.full_name]));
      setPool(
        allPool
          .filter((j) => j.event_id === eventId)
          .map((j) => ({ id: j.id, full_name: nameById.get(j.person_id) ?? '—' })),
      );
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function findOrCreatePerson(fullName: string): Promise<number> {
    const existing = people.find((p) => p.full_name.toLowerCase() === fullName.toLowerCase());
    if (existing) return existing.id;
    const created = await api.createPerson({ full_name: fullName });
    return created.id;
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!juryName.trim()) return;
    const personId = await findOrCreatePerson(juryName.trim());
    await api.createJuryMember({ event_id: eventId, person_id: personId, is_chairman: 0 });
    setJuryName('');
    await refresh();
  }

  async function handleRemove(id: number) {
    await api.deleteJuryMember(id);
    await refresh();
  }

  if (!event) return <p>Loading…</p>;

  return (
    <div className="page">
      <h2>Judge pool — {event.name}</h2>
      <p className="muted">
        Judges available at this regatta. Which ones sit on a given case, and who chairs it, is picked from the
        Case screen's Jury Members box.
      </p>
      {error && <p className="error">{error}</p>}
      <ul className="list">
        {pool.map((j) => (
          <li key={j.id}>
            {j.full_name}{' '}
            <button type="button" onClick={() => handleRemove(j.id)}>
              Remove
            </button>
          </li>
        ))}
        {pool.length === 0 && <li className="muted">No judges in the pool yet.</li>}
      </ul>
      <form onSubmit={handleAdd} className="inline-form">
        <input
          list="people-list"
          placeholder="Full name"
          value={juryName}
          onChange={(e) => setJuryName(e.target.value)}
          required
        />
        <button type="submit">Add</button>
      </form>
      <datalist id="people-list">
        {people.map((p) => (
          <option key={p.id} value={p.full_name} />
        ))}
      </datalist>
    </div>
  );
}

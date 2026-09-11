import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import type { CaseRow, EventRow, PersonRow } from '../types';

interface Props {
  eventId: number;
  onOpenCase: (caseId: number) => void;
}

interface JuryRow {
  id: number;
  is_chairman: 0 | 1;
  full_name: string;
}

// Jury members and the panel chairman belong to the event, not the case
// (CONTEXT.md section 4) — managed here, once per event, shared by every
// case shown under it.
export function EventDetail({ eventId, onOpenCase }: Props) {
  const [event, setEvent] = useState<EventRow | null>(null);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [jury, setJury] = useState<JuryRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [caseNumber, setCaseNumber] = useState('');
  const [day, setDay] = useState('');
  const [race, setRace] = useState('');

  const [juryName, setJuryName] = useState('');
  const [isChairman, setIsChairman] = useState(false);

  async function refresh() {
    try {
      const [events, allCases, allPeople, allJury] = await Promise.all([
        api.listEvents(),
        api.listCases(),
        api.listPeople(),
        api.listJuryMembers(),
      ]);
      setEvent(events.find((e) => e.id === eventId) ?? null);
      setCases(allCases.filter((c) => c.event_id === eventId));
      setPeople(allPeople);
      const nameById = new Map(allPeople.map((p) => [p.id, p.full_name]));
      setJury(
        allJury
          .filter((j) => j.event_id === eventId)
          .map((j) => ({ id: j.id, is_chairman: j.is_chairman, full_name: nameById.get(j.person_id) ?? '—' })),
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

  async function handleCreateCase(e: FormEvent) {
    e.preventDefault();
    if (!caseNumber.trim()) return;
    const created = await api.createCase({
      event_id: eventId,
      case_number: caseNumber.trim(),
      day: day.trim() || null,
      race: race.trim() || null,
    });
    setCaseNumber('');
    setDay('');
    setRace('');
    await refresh();
    onOpenCase(created.id);
  }

  async function handleAddJury(e: FormEvent) {
    e.preventDefault();
    if (!juryName.trim()) return;
    const personId = await findOrCreatePerson(juryName.trim());
    await api.createJuryMember({ event_id: eventId, person_id: personId, is_chairman: isChairman ? 1 : 0 });
    setJuryName('');
    setIsChairman(false);
    await refresh();
  }

  async function handleRemoveJury(id: number) {
    await api.deleteJuryMember(id);
    await refresh();
  }

  if (!event) return <p>Loading…</p>;

  return (
    <div className="page">
      <h2>{event.name}</h2>
      {error && <p className="error">{error}</p>}

      <section>
        <h3>Cases</h3>
        <ul className="list">
          {cases.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => onOpenCase(c.id)}>
                Case {c.case_number}
              </button>
              {c.day && <span className="muted"> — Day {c.day}</span>}
              {c.race && <span className="muted"> — Race {c.race}</span>}
            </li>
          ))}
          {cases.length === 0 && <li className="muted">No cases yet.</li>}
        </ul>
        <form onSubmit={handleCreateCase} className="inline-form">
          <input
            placeholder="Case number"
            value={caseNumber}
            onChange={(e) => setCaseNumber(e.target.value)}
            required
          />
          <input placeholder="Day" value={day} onChange={(e) => setDay(e.target.value)} />
          <input placeholder="Race" value={race} onChange={(e) => setRace(e.target.value)} />
          <button type="submit">New case</button>
        </form>
      </section>

      <section>
        <h3>Jury members</h3>
        <p className="muted">Belongs to the event, shared by every case.</p>
        <ul className="list">
          {jury.map((j) => (
            <li key={j.id}>
              {j.full_name}
              {j.is_chairman ? ' (Chairman)' : ''}{' '}
              <button type="button" onClick={() => handleRemoveJury(j.id)}>
                Remove
              </button>
            </li>
          ))}
          {jury.length === 0 && <li className="muted">No jury members yet.</li>}
        </ul>
        <form onSubmit={handleAddJury} className="inline-form">
          <input
            list="people-list"
            placeholder="Full name"
            value={juryName}
            onChange={(e) => setJuryName(e.target.value)}
            required
          />
          <label>
            <input type="checkbox" checked={isChairman} onChange={(e) => setIsChairman(e.target.checked)} />
            Chairman
          </label>
          <button type="submit">Add</button>
        </form>
        <datalist id="people-list">
          {people.map((p) => (
            <option key={p.id} value={p.full_name} />
          ))}
        </datalist>
      </section>
    </div>
  );
}

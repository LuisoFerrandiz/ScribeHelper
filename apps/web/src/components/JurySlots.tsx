import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';

const JURY_SLOT_COUNT = 5;

interface JuryRow {
  id: number;
  person_id: number;
  is_chairman: 0 | 1;
  full_name: string;
}

interface PoolEntry {
  personId: number;
  fullName: string;
}

interface Props {
  caseId: number;
  eventId: number;
  jury: JuryRow[];
  onJuryChange: () => Promise<void>; // refreshes ONLY caseFull.jury — never the 4 text boxes
  findOrCreatePerson: (fullName: string) => Promise<number>; // passed down from CaseForm.tsx, not duplicated
}

// 5 fixed slots (constant, not per-event/case config yet — SPEC-009
// "Fuera de esta spec"). Slot order = case_jury_member.id ascending
// (creation order), independent of who's chairman.
export function JurySlots({ caseId, eventId, jury, onJuryChange, findOrCreatePerson }: Props) {
  const [pool, setPool] = useState<PoolEntry[]>([]);
  const [newJudgeName, setNewJudgeName] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshPool() {
    const [allPool, allPeople] = await Promise.all([api.listJuryMembers(), api.listPeople()]);
    const nameById = new Map(allPeople.map((p) => [p.id, p.full_name]));
    setPool(
      allPool
        .filter((j) => j.event_id === eventId)
        .map((j) => ({ personId: j.person_id, fullName: nameById.get(j.person_id) ?? '—' })),
    );
  }

  useEffect(() => {
    refreshPool();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const sortedJury = [...jury].sort((a, b) => a.id - b.id);
  const slots: (JuryRow | null)[] = [...sortedJury];
  while (slots.length < JURY_SLOT_COUNT) slots.push(null);

  // Duplicate guard (RF-008): a person already sitting in another slot
  // of THIS case is excluded from every other slot's options — still
  // listed in its own slot, so leaving it as-is is a no-op, not a gap.
  function optionsFor(slot: JuryRow | null) {
    const takenElsewhere = new Set(sortedJury.filter((j) => j.id !== slot?.id).map((j) => j.person_id));
    return pool.filter((p) => !takenElsewhere.has(p.personId));
  }

  async function handleSlotChange(slot: JuryRow | null, personIdStr: string) {
    setError(null);
    try {
      if (personIdStr === '') {
        if (slot) await api.deleteCaseJuryMember(slot.id);
      } else if (slot) {
        await api.updateCaseJuryMember(slot.id, { person_id: Number(personIdStr) });
      } else {
        await api.createCaseJuryMember({ case_id: caseId, person_id: Number(personIdStr), is_chairman: 0 });
      }
      await onJuryChange();
    } catch (e) {
      setError((e as Error).message.includes('duplicate') ? 'That judge is already assigned to this case.' : (e as Error).message);
    }
  }

  async function handleChairmanChange(slot: JuryRow, checked: boolean) {
    setError(null);
    try {
      if (checked) {
        await Promise.all(
          sortedJury
            .filter((j) => j.is_chairman && j.id !== slot.id)
            .map((j) => api.updateCaseJuryMember(j.id, { is_chairman: 0 })),
        );
      }
      await api.updateCaseJuryMember(slot.id, { is_chairman: checked ? 1 : 0 });
      await onJuryChange();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleAddJudge(e: FormEvent) {
    e.preventDefault();
    if (!newJudgeName.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const personId = await findOrCreatePerson(newJudgeName.trim());
      await api.createJuryMember({ event_id: eventId, person_id: personId, is_chairman: 0 });
      await refreshPool();
      const firstEmptyIndex = slots.findIndex((s) => s === null);
      if (firstEmptyIndex !== -1) {
        await api.createCaseJuryMember({ case_id: caseId, person_id: personId, is_chairman: 0 });
        await onJuryChange();
      }
      setNewJudgeName('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAdding(false);
    }
  }

  return (
    <section className="box jury-slots">
      <h3>Jury Members</h3>
      {error && <p className="error">{error}</p>}
      <div className="jury-slots-grid">
        {slots.map((slot, i) => (
          <div key={slot?.id ?? `empty-${i}`} className="jury-slot">
            <select value={slot?.person_id ?? ''} onChange={(e) => handleSlotChange(slot, e.target.value)}>
              <option value="">— unassigned —</option>
              {optionsFor(slot).map((p) => (
                <option key={p.personId} value={p.personId}>
                  {p.fullName}
                </option>
              ))}
            </select>
            <label className="jury-slot-chairman">
              <input
                type="checkbox"
                checked={!!slot?.is_chairman}
                disabled={!slot}
                onChange={(e) => slot && handleChairmanChange(slot, e.target.checked)}
              />
              Chairman
            </label>
          </div>
        ))}
      </div>
      <form onSubmit={handleAddJudge} className="inline-form">
        <input placeholder="New judge name" value={newJudgeName} onChange={(e) => setNewJudgeName(e.target.value)} />
        <button type="submit" disabled={adding}>
          {adding ? 'Adding…' : '+ New judge'}
        </button>
      </form>
    </section>
  );
}

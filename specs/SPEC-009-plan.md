# SPEC-009 — Plan

Relacionado: `SPEC-009-repaso-lectura.md` (requisitos).

## RF-006 — `person_id` en el jury del caso (backend, primero — todo lo demás depende de esto)

`apps/api/src/routes/caseDetail.ts`, query de `jury`:

```sql
SELECT case_jury_member.id, case_jury_member.person_id,
       case_jury_member.is_chairman, person.full_name
FROM case_jury_member JOIN person ON person.id = case_jury_member.person_id
WHERE case_jury_member.case_id = ?
```

(solo añade `case_jury_member.person_id` al `SELECT`, el resto igual.)

`apps/web/src/types.ts`, `CaseFull.jury`:

```ts
jury: { id: number; person_id: number; is_chairman: 0 | 1; full_name: string }[];
```

## `apps/web/src/api.ts` — wrapper que falta

Junto a `createCaseJuryMember`/`deleteCaseJuryMember` (ya existen):

```ts
updateCaseJuryMember: (id: number, data: Partial<CaseJuryMemberRow>) =>
  put<CaseJuryMemberRow>(`/case-jury-members/${id}`, data),
```

(`put` ya existe en `api.ts` junto a `post`/`del` — confirmado, solo falta este wrapper.)

## Backend — capturar duplicado también en `PUT` (hallazgo del `reviewer`)

`apps/api/src/routes/crud.ts`, handler `app.put`: hoy no tiene el
`try/catch` de `UNIQUE constraint failed` que el `POST` ya tiene
(líneas 36-47 del fichero actual). `case_jury_member` tiene
`UNIQUE(case_id, person_id)` — cambiar el nombre de un cuadro ya
ocupado al mismo juez que otro cuadro del mismo caso pasa por `PUT`, no
por `POST`, y hoy ese camino no está cubierto (500 sin manejar en vez
de 409). Envolver igual que el `POST`:

```ts
app.put(`/${prefix}/:id`, (req, reply) => {
  const { id } = req.params as { id: string };
  const body = req.body as Record<string, unknown>;
  const cols = fields.filter((f) => f in body);
  if (cols.length === 0) return reply.code(400).send({ error: 'no valid fields' });

  const setClause = cols.map((c) => `${c} = ?`).join(', ');
  const extra = touchUpdatedAt ? `, updated_at = datetime('now')` : '';
  try {
    db.prepare(`UPDATE ${table} SET ${setClause}${extra} WHERE id = ?`).run(
      ...cols.map((c) => body[c] as never),
      id,
    );
  } catch (e) {
    if ((e as Error).message.includes('UNIQUE constraint failed')) {
      return reply.code(409).send({ error: 'duplicate' });
    }
    throw e;
  }

  const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
  if (!row) return reply.code(404).send({ error: 'not found' });
  return row;
});
```

Generic — protege cualquier entidad con `UNIQUE` que pase por `PUT`,
no solo `case_jury_member` (mismo razonamiento que el comentario ya
existente junto al `POST`).

## RF-001 — Pestaña Review

`apps/web/src/components/CaseForm.tsx`:

- `CaseTab`: añadir `'review'` al union.
- Botón de pestaña nuevo, al final de la barra (después de "5. Decision"):

```tsx
<button
  type="button"
  className={caseTab === 'review' ? 'active' : undefined}
  aria-current={caseTab === 'review'}
  onClick={() => setCaseTab('review')}
>
  6. Review
</button>
```

## RF-002 — Cuatro cajas, mismo estado

Dentro de `{caseTab === 'review' && ( ... )}`, cuatro bloques
`<label>Procedural Matters<textarea value={proceduralMatters}
onChange={(e) => setProceduralMatters(e.target.value)} /></label>`
(y lo mismo para `factsFound`/`conclusion`/`decision`) — textarea
simple, sin `GhostTextarea` ni `SuggestionsPanel`, apuntando a los
mismos `useState` que ya existen en el componente (no se crea ningún
estado nuevo). Envueltas en `.box` para mantener el mismo tratamiento
visual (Literata, padding) que las demás cajas.

```tsx
{caseTab === 'review' && (
  <div className="tab-panel">
    <section className="box review-box">
      <h3>Procedural Matters</h3>
      <textarea value={proceduralMatters} onChange={(e) => setProceduralMatters(e.target.value)} rows={4} />
      <h3>Facts Found</h3>
      <textarea value={factsFound} onChange={(e) => setFactsFound(e.target.value)} rows={6} />
      <h3>Conclusion</h3>
      <textarea value={conclusion} onChange={(e) => setConclusion(e.target.value)} rows={4} />
      <h3>Decision</h3>
      <textarea value={decision} onChange={(e) => setDecision(e.target.value)} rows={4} />
    </section>

    <JurySlots
      caseId={caseId}
      eventId={caseFull.event.id}
      jury={caseFull.jury}
      onJuryChange={reloadJury}
      findOrCreatePerson={findOrCreatePerson}
    />
  </div>
)}
```

**No se usa `reload`** (hallazgo bloqueante del `reviewer`): `reload()`
vuelve a pedir el caso completo y hace
`setProceduralMatters(full.procedural_matters)` /
`setFactsFound(...)` / `setConclusion(...)` / `setDecision(...)` con
los valores ya guardados en servidor — si el juez tiene texto sin
guardar en cualquiera de las 4 cajas (en esta pestaña o en otra) y
toca algo del jurado, ese texto desaparece sustituido por el último
guardado. En su lugar, `CaseForm.tsx` gana una función nueva que solo
toca `caseFull.jury`:

```ts
async function reloadJury() {
  const full = await api.getCaseFull(caseId);
  setCaseFull((prev) => (prev ? { ...prev, jury: full.jury } : full));
}
```

(no toca ningún `useState` de texto — `caseFull` es la única pieza de
estado que lee `JurySlots`/`formatJuryMembers`/el export HTML; las
cuatro cajas siguen viviendo en sus propios `useState`, ajenos a este
refresco.)

`findOrCreatePerson` ya existe en `CaseForm.tsx` (se usa hoy para
partes/testigos) — se pasa tal cual como prop, no se duplica dentro de
`JurySlots.tsx` (hallazgo bloqueante del `reviewer`: la spec promete
reuso literal de esta función, no una tercera copia del mismo patrón
que ya existe en `JuryPanel.tsx`).

## RF-003, RF-004, RF-005 — `JurySlots.tsx` (componente nuevo)

`apps/web/src/components/JurySlots.tsx`:

```tsx
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
    const takenElsewhere = new Set(
      sortedJury.filter((j) => j.id !== slot?.id).map((j) => j.person_id),
    );
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
            <select
              value={slot?.person_id ?? ''}
              onChange={(e) => handleSlotChange(slot, e.target.value)}
            >
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
        <input
          placeholder="New judge name"
          value={newJudgeName}
          onChange={(e) => setNewJudgeName(e.target.value)}
        />
        <button type="submit" disabled={adding}>
          {adding ? 'Adding…' : '+ New judge'}
        </button>
      </form>
    </section>
  );
}
```

Notas sobre el esqueleto de arriba (se ajusta durante la
implementación, no es literal, pero los 3 puntos siguientes son
correcciones directas de los hallazgos bloqueantes del `reviewer` y
deben conservarse):
- `onJuryChange` (no `onChange`/`reload`) — ver más arriba, nunca toca
  las 4 cajas de texto.
- `findOrCreatePerson` llega por prop, no se redefine aquí.
- `optionsFor(slot)` excluye del `<select>` a quien ya está sentado en
  *otro* slot de este caso (RF-008); `handleSlotChange` /
  `handleChairmanChange` / `handleAddJudge` capturan el error del
  backend (409 `duplicate` u otro) y lo muestran en `error`, nunca lo
  dejan sin manejar.

`apps/web/src/components/CaseForm.tsx` — import nuevo:

```ts
import { JurySlots } from './JurySlots';
```

## CSS

`apps/web/src/styles.css` — reusar `.inline-form` ya existente para el
formulario de alta; añadir:

```css
.jury-slots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
  margin: 8px 0;
}

.jury-slot {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.jury-slot select {
  width: 100%;
}

.jury-slot-chairman {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.82em;
  color: var(--ink-soft);
}

.review-box h3:first-child {
  margin-top: 0;
}
```

## Orden de ejecución

1. RF-006 (`person_id` en el backend) — todo lo demás lo necesita.
2. `api.ts` (`updateCaseJuryMember`, `put` ya existe).
3. Backend — `UNIQUE` capturado también en `PUT` de `crud.ts`.
4. RF-003/004/005/008 (`JurySlots.tsx`, con exclusión de duplicados y
   manejo de error).
5. RF-001/002/007 (pestaña Review en `CaseForm.tsx`: las 4 cajas +
   `reloadJury()` dedicada + `findOrCreatePerson` pasada como prop a
   `JurySlots`).
6. CSS.
7. Verificación conjunta.

## Verificación

- `npm run typecheck` (web) / `npm run build` (api) limpios.
- En vivo, caso con jurado ya asignado (p. ej. TEST-01 si tiene
  jurado, si no un caso de prueba nuevo):
  - pestaña "6. Review" muestra las 4 cajas con el mismo texto que las
    pestañas individuales; escribir en una y cambiar de pestaña
    conserva el cambio sin guardar (mismo comportamiento que ya existe
    para las otras cajas — no persiste hasta pulsar Save en General).
  - **RF-007 — el caso que motivó el hallazgo bloqueante:** escribir
    algo nuevo en Facts Found (pestaña Review, sin pulsar Save) y
    luego asignar/cambiar un juez o marcar Chairman en la misma
    visita → el texto de Facts Found sigue intacto en pantalla después
    del cambio de jurado.
  - 5 cuadros de jurado; elegir un nombre en uno vacío lo asigna
    (recargar la página lo conserva, ya persistido vía
    `case_jury_member`); cambiar el nombre de un cuadro ocupado
    actualiza esa misma fila (no aparecen duplicados); "— unassigned —"
    la borra.
  - **RF-008:** un juez ya sentado en un cuadro no aparece como opción
    en los demás `<select>` de este caso; si se fuerza un duplicado
    igualmente (p. ej. llamando a la API a mano), el mensaje de error
    se muestra en la pestaña, no un 500 silencioso ni un crash.
  - Marcar Chairman en un cuadro desmarca cualquier otro que lo
    tuviera.
  - "+ New judge" con un nombre nuevo: aparece en el pool de todos los
    `<select>` y se asigna automáticamente a un hueco libre; con los 5
    ocupados, se añade al pool pero ningún cuadro cambia.
  - Botón "Download decision (.html)" sigue arriba y exporta
    correctamente (sin cambios, ya probado en SPEC-008).
- Revisión con el agente `reviewer` antes de marcar como terminado.

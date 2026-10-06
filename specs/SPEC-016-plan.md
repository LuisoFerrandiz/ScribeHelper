# SPEC-016 — Plan

Relacionado: `SPEC-016-ux-form-tweaks.md` (requisitos).

## 1. Backend — `apps/api/db/schema.sql`

Añadir la columna al `CREATE TABLE` existente (para una base de datos
nueva, creada desde cero):

```sql
CREATE TABLE IF NOT EXISTS protest_case (
  ...
  day TEXT,
  race TEXT,
  informed_at TEXT,
  with_case_note TEXT, -- SPEC-016: free-text note alongside case_link
  ...
```

## 2. Backend — `apps/api/src/db/migrate.ts`

```ts
db.exec(schema);
console.log('Schema applied:', schemaPath);

// SPEC-016: first real ALTER TABLE in this project — CREATE TABLE IF
// NOT EXISTS above does nothing to a table that already exists, and
// the deployed DB already has protest_case with real data. Runs on
// every container start (Dockerfile), so it must be idempotent.
const hasWithCaseNote = (db.prepare(`PRAGMA table_info(protest_case)`).all() as { name: string }[]).some(
  (c) => c.name === 'with_case_note',
);
if (!hasWithCaseNote) {
  db.exec(`ALTER TABLE protest_case ADD COLUMN with_case_note TEXT`);
  console.log('Migration: added protest_case.with_case_note');
}

await seedBasePhrases();
seedAdminUser();
```

## 3. Backend — `apps/api/src/routes/index.ts`

```ts
registerCrud(app, 'cases', {
  table: 'protest_case',
  fields: [
    'event_id',
    'case_number',
    'day',
    'race',
    'informed_at',
    'with_case_note', // SPEC-016
    'procedural_matters',
    'facts_found',
    'conclusion',
    'decision',
  ],
  touchUpdatedAt: true,
  skipDelete: true,
});
```

## 4. Backend — `apps/api/src/routes/caseSummary.ts`

```ts
export interface CaseSummaryRow {
  id: number;
  case_number: string;
  event_id: number;
  event_name: string;
  decided: boolean;
  initiators: { sail_number: string | null; boat_name: string | null }[];
  respondents: { sail_number: string | null; boat_name: string | null }[];
}
// ...
const rows: CaseSummaryRow[] = cases.map((c) => {
  const caseParties = partiesByCase.get(c.id) ?? [];
  const byRole = (role: 'initiator' | 'respondent') =>
    caseParties.filter((x) => x.role === role).map((p) => ({ sail_number: p.sail_number, boat_name: p.boat_name }));
  return {
    id: c.id,
    case_number: c.case_number,
    event_id: c.event_id,
    event_name: c.event_name,
    decided: c.decision.trim() !== '',
    initiators: byRole('initiator'),
    respondents: byRole('respondent'),
  };
});
```

## 5. Frontend — `apps/web/src/types.ts`

```ts
export interface CaseRow {
  ...
  with_case_note: string | null; // SPEC-016
  ...
}

export interface CaseSummaryRow {
  id: number;
  case_number: string;
  event_id: number;
  event_name: string;
  decided: boolean;
  initiators: { sail_number: string | null; boat_name: string | null }[];
  respondents: { sail_number: string | null; boat_name: string | null }[];
}
```

(`CaseFull.parties` already an array — no change needed there.)

## 6. Frontend — `apps/web/src/api.ts`

```ts
deleteParty: (id: number) => del(`/parties/${id}`),
```

`updateParty` is removed — with no inline editing of an already-saved
party (same as Witness today), its only caller (`savePartyRole`, in
`CaseForm.tsx`) goes away with the rest of that function; nothing else
in the frontend calls it (confirmed by grep before removing it).

## 7. Frontend — `apps/web/src/components/PartyReference.tsx`

```tsx
import { formatBoat } from '../format';

interface Party {
  sailNumber: string;
  boatName: string;
}

interface Props {
  initiators: Party[];
  respondents: Party[];
  race?: string;
  currentText: string;
}

export function PartyReference({ initiators, respondents, race, currentText }: Props) {
  const matches = (p: Party) => !!p.sailNumber && currentText.includes(p.sailNumber);
  const raceMatches = !!race && currentText.includes(race);

  const row = (label: string, p: Party, key: string | number) => (
    <div key={key} className={matches(p) ? 'party-reference-row highlight' : 'party-reference-row'}>
      <strong>{label}:</strong> {formatBoat({ sail_number: p.sailNumber || null, boat_name: p.boatName || null })}
    </div>
  );

  return (
    <div className="party-reference">
      {initiators.length > 0
        ? initiators.map((p, i) => row('Initiator', p, `i-${i}`))
        : row('Initiator', { sailNumber: '', boatName: '' }, 'i-empty')}
      {respondents.length > 0
        ? respondents.map((p, i) => row('Respondent', p, `r-${i}`))
        : row('Respondent', { sailNumber: '', boatName: '' }, 'r-empty')}
      {race && (
        <div className={raceMatches ? 'party-reference-row highlight' : 'party-reference-row'}>
          <strong>Race:</strong> {race}
        </div>
      )}
    </div>
  );
}
```

## 8. Frontend — `apps/web/src/components/SuggestionsPanel.tsx`

```ts
interface PartyReferenceData {
  initiators: { sailNumber: string; boatName: string }[];
  respondents: { sailNumber: string; boatName: string }[];
  race?: string;
}
```

(The JSX passing `partyReference.initiators`/`.respondents` to
`<PartyReference>` follows the same prop names — adjust the two call
sites, lines ~67-72 today.)

## 9. Frontend — `apps/web/src/format.ts`

```ts
export function formatParties(c: CaseFull): string {
  const roles: Array<'initiator' | 'respondent'> = ['initiator', 'respondent'];
  const lines = roles.flatMap((role) => {
    const matches = c.parties.filter((p) => p.role === role);
    if (matches.length === 0) return [`${capitalize(role)}: —`];
    return matches.map((p) => {
      const boat = formatBoat(p);
      const rep = p.represented_by ? `, represented by ${p.represented_by}` : '';
      return `${capitalize(role)}: ${boat}${rep}`;
    });
  });
  return lines.join('\n');
}

export function formatAutoProceduralLines(c: CaseFull): string[] {
  const roles: Array<'initiator' | 'respondent'> = ['initiator', 'respondent'];
  const partyLines = roles.flatMap((role) =>
    c.parties
      .filter((p) => p.role === role && p.represented_by)
      .map((p) => {
        const boat = [p.sail_number, p.boat_name].filter(Boolean).join(' ') || capitalize(role);
        return `${boat} was represented by ${p.represented_by}.`;
      }),
  );
  const witnessLines = c.witnesses.map((w) => `${w.full_name} gave evidence as a witness.`);
  return [...partyLines, ...witnessLines];
}
```

`formatFullDecisionHtml` — party table and "With Case(s)" line:

```ts
const initiators = c.parties.filter((p) => p.role === 'initiator');
const respondents = c.parties.filter((p) => p.role === 'respondent');
const partyRows = (label: string, list: typeof c.parties) =>
  list.length ? list.map((p) => partyRow(label, p)).join('') : partyRow(label, undefined);
// ...
${partyRows('Initiator:', initiators)}
${partyRows('Respondent:', respondents)}
// ...
const linkedList = c.linkedCases.map((x) => x.case_number).join(', ');
const withCases = [linkedList, c.with_case_note].filter(Boolean).join(' — ') || '—';
```

(`partyRow()` itself is unchanged — already takes an optional single
party; only the call sites change from "exactly one call per role" to
"one call per party in the role's list, or one empty call if none.")

## 10. Frontend — `apps/web/src/components/CaseList.tsx`

```tsx
<td>{r.initiators.map(formatBoat).join(', ') || '—'}</td>
<td>{r.respondents.map(formatBoat).join(', ') || '—'}</td>
```

## 11. Frontend — `apps/web/src/components/CaseForm.tsx`

### 11a. Types and state

```tsx
interface PartyDraft {
  id: number | null;
  sailNumber: string;
  boatName: string;
  representedBy: string;
}
const emptyPartyDraft: PartyDraft = { id: null, sailNumber: '', boatName: '', representedBy: '' };

// Replaces `initiator`/`respondent: PartyEdit` singular state.
const [partyDrafts, setPartyDrafts] = useState<Record<PartyRole, PartyDraft[]>>({
  initiator: [],
  respondent: [],
});
const [partyForm, setPartyForm] = useState<Record<PartyRole, PartyDraft>>({
  initiator: emptyPartyDraft,
  respondent: emptyPartyDraft,
});
const [withCaseNote, setWithCaseNote] = useState('');
```

`sailNumberRoles`:

```tsx
const sailNumberRoles = useMemo(
  () => [
    ...partyDrafts.initiator.filter((p) => p.sailNumber).map((p) => ({ sailNumber: p.sailNumber, role: 'initiator' as const })),
    ...partyDrafts.respondent.filter((p) => p.sailNumber).map((p) => ({ sailNumber: p.sailNumber, role: 'respondent' as const })),
  ],
  [partyDrafts],
);
```

### 11b. `reload()`/`refreshParties()` — population

Both replace their `initiator`/`respondent` single-row `.find()` with:

```tsx
setPartyDrafts({
  initiator: full.parties
    .filter((p) => p.role === 'initiator')
    .map((p) => ({ id: p.id, sailNumber: p.sail_number ?? '', boatName: p.boat_name ?? '', representedBy: p.represented_by ?? '' })),
  respondent: full.parties
    .filter((p) => p.role === 'respondent')
    .map((p) => ({ id: p.id, sailNumber: p.sail_number ?? '', boatName: p.boat_name ?? '', representedBy: p.represented_by ?? '' })),
});
```

`reload()` additionally sets `setWithCaseNote(full.with_case_note ?? '')`
alongside its other scalar-field sets (`setCaseNumber`, `setDay`, ...).

### 11c. Stage/unstage/suggest handlers (replace `savePartyRole`/`useSuggestedParty`)

```tsx
function handleStageParty(role: PartyRole, e: FormEvent) {
  e.preventDefault();
  const form = partyForm[role];
  if (!form.sailNumber.trim() && !form.boatName.trim() && !form.representedBy.trim()) return;
  setPartyDrafts((prev) => ({ ...prev, [role]: [...prev[role], { ...form, id: null }] }));
  setPartyForm((prev) => ({ ...prev, [role]: emptyPartyDraft }));
}

function handleUnstageParty(role: PartyRole, index: number) {
  setPartyDrafts((prev) => ({ ...prev, [role]: prev[role].filter((_, i) => i !== index) }));
}

function addSuggestedParty(role: PartyRole) {
  const suggested = extraction?.parties[role];
  if (!suggested) return;
  setPartyDrafts((prev) => ({
    ...prev,
    [role]: [
      ...prev[role],
      { id: null, sailNumber: suggested.sail_number ?? '', boatName: suggested.boat_name ?? '', representedBy: suggested.represented_by ?? '' },
    ],
  }));
}
```

### 11d. `handleSaveAll` — party reconciliation block (replaces the two
`await savePartyRole(...)` calls) and `with_case_note` in the PATCH

```tsx
await api.updateCase(caseId, {
  case_number: caseNumber.trim(),
  day: day.trim() || null,
  race: race.trim() || null,
  informed_at: informedAt.trim() || null,
  with_case_note: withCaseNote.trim() || null, // SPEC-016
  procedural_matters: proceduralMatters,
  facts_found: factsFound,
  conclusion,
  decision,
});

for (const role of ['initiator', 'respondent'] as PartyRole[]) {
  const drafts = partyDrafts[role];
  const keptIds = new Set(drafts.filter((d) => d.id !== null).map((d) => d.id));
  for (const p of caseFull?.parties.filter((p) => p.role === role) ?? []) {
    if (!keptIds.has(p.id)) await api.deleteParty(p.id);
  }
  for (const d of drafts) {
    if (d.id === null && (d.sailNumber.trim() || d.boatName.trim() || d.representedBy.trim())) {
      const boatId = d.sailNumber.trim() ? await findOrCreateBoat(d.sailNumber.trim(), d.boatName.trim() || null) : null;
      const representedById = d.representedBy.trim() ? await findOrCreatePerson(d.representedBy.trim()) : null;
      await api.createParty({ case_id: caseId, role, boat_id: boatId, represented_by_id: representedById });
    }
  }
}
```

(`savePartyRole` function itself is deleted — fully replaced by this
inline block, same spirit as how witness reconciliation already lives
inline in `handleSaveAll`.)

### 11e. JSX — "1. General" tab

```tsx
{caseTab === 'general' && (
  <div className="tab-panel">
    <section className="box general-box">
      <h2>General</h2>
      <div className="general-fields-col">
        <div className="party-row">
          <strong>Case number</strong>
          <input value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} required />
        </div>
        <div className="party-row">
          <strong>Day</strong>
          <input value={day} onChange={(e) => setDay(e.target.value)} />
          {extraction?.day_candidate && (
            <button type="button" onClick={useSuggestedDay}>Use suggested</button>
          )}
        </div>
        <div className="party-row">
          <strong>Race</strong>
          <input value={race} onChange={(e) => setRace(e.target.value)} />
          {extraction?.race_candidate && (
            <button type="button" onClick={useSuggestedRace}>Use suggested</button>
          )}
        </div>
        <div className="party-row">
          <strong>With case(s)</strong>
          <div className="with-case-inline">
            {/* unchanged chips + <select> block */}
          </div>
        </div>
        <div className="party-row">
          <strong>With case(s) notes</strong>
          <input
            value={withCaseNote}
            onChange={(e) => setWithCaseNote(e.target.value)}
            placeholder="Free text — e.g. a case from another regatta"
          />
        </div>
      </div>
    </section>
  </div>
)}
```

### 11f. JSX — "2. Parties & Witness" tab, Parties half

Replaces the current `(['initiator','respondent'] as PartyRole[]).map(...)`
block (single-row-per-role) with a list+add-form per role, mirroring
Witness's own markup immediately below it:

```tsx
{(['initiator', 'respondent'] as PartyRole[]).map((role) => (
  <div key={role}>
    <h3>{role === 'initiator' ? 'Initiator(s)' : 'Respondent(s)'}</h3>
    <ul className="list">
      {partyDrafts[role].map((p, i) => (
        <li key={`${p.id ?? 'new'}-${i}`}>
          {formatBoat({ sail_number: p.sailNumber || null, boat_name: p.boatName || null })}
          {p.representedBy ? `, represented by ${p.representedBy}` : ''}{' '}
          <button type="button" onClick={() => handleUnstageParty(role, i)}>Remove</button>
        </li>
      ))}
      {partyDrafts[role].length === 0 && (
        <li className="muted">No {role === 'initiator' ? 'initiators' : 'respondents'} yet.</li>
      )}
    </ul>
    {extraction?.parties[role] && (
      <p className="muted">
        Suggested: {formatBoat({
          sail_number: extraction.parties[role]?.sail_number ?? null,
          boat_name: extraction.parties[role]?.boat_name ?? null,
        })}{' '}
        <button type="button" onClick={() => addSuggestedParty(role)}>Add</button>
      </p>
    )}
    <form onSubmit={(e) => handleStageParty(role, e)} className="inline-form">
      <input
        list="boat-sail-numbers"
        placeholder="Sail number"
        value={partyForm[role].sailNumber}
        onChange={(e) => setPartyForm((prev) => ({ ...prev, [role]: { ...prev[role], sailNumber: e.target.value } }))}
      />
      <input
        list="boat-names"
        placeholder="Boat name"
        value={partyForm[role].boatName}
        onChange={(e) => setPartyForm((prev) => ({ ...prev, [role]: { ...prev[role], boatName: e.target.value } }))}
      />
      <input
        list="people-list"
        placeholder="Represented by"
        value={partyForm[role].representedBy}
        onChange={(e) => setPartyForm((prev) => ({ ...prev, [role]: { ...prev[role], representedBy: e.target.value } }))}
      />
      <button type="submit">Add</button>
    </form>
  </div>
))}
```

(Witness section right below stays exactly as-is — it's already the
pattern being copied.)

### 11g. `partyReference` props (Facts Found tab, Decision tab)

```tsx
partyReference={{
  initiators: partyDrafts.initiator.map((p) => ({ sailNumber: p.sailNumber, boatName: p.boatName })),
  respondents: partyDrafts.respondent.map((p) => ({ sailNumber: p.sailNumber, boatName: p.boatName })),
  race, // Decision only
}}
```

### 11h. JSX — "6. Decision" tab gains an Informed-at input, OUTSIDE the CopyBox

D-029 rule 1 (per the spec's RF-401): a form field never sits inside
the same tab's document `CopyBox`. The input goes in its own small
form section, above the Decision `<CopyBox>`, same shape as the
"General" section (a `<section className="box">` with a `.party-row`
inside — not a `<CopyBox>`, since this single field isn't one of the
8 fixed document boxes):

```tsx
{caseTab === 'decision' && (
  <div className="tab-panel">
    <section className="box">
      <div className="party-row">
        <strong>Informed at (date &amp; time)</strong>
        <input value={informedAt} onChange={(e) => setInformedAt(e.target.value)} placeholder="e.g. 2026-10-06 18:30" />
      </div>
    </section>
    {/* existing Decision CopyBox unchanged below */}
```

### 11i. JSX — "7. Review" tab gains the same field

```tsx
<h3>Informed at (date &amp; time)</h3>
<input value={informedAt} onChange={(e) => setInformedAt(e.target.value)} />
```

(Placed in `review-box`, same shared `informedAt` state — no new
useState, no new save path; already travels in `handleSaveAll`'s
`PATCH` since SPEC-010/SPEC-014.)

## 12. CSS — `apps/web/src/styles.css`

```css
.general-fields-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
```

`.general-fields-row` and its two child rules become unused after this
spec (nothing references them once General's JSX changes) — removed,
not left dead. `.party-row`/`.with-case-inline` unchanged, reused as-is.

## Verificación

- `npm run build` (api) / `npm run typecheck` (web) limpios.
- Migración: borrar/recrear una copia de prueba de la base de datos
  con datos previos a esta spec (sin `with_case_note`), correr
  `npm run migrate`, confirmar que la columna aparece
  (`PRAGMA table_info`) y que correr `migrate` una segunda vez no
  falla (idempotente).
- RF-101: pestaña General se ve en filas apiladas, visualmente
  consistente con Parties.
- RF-201/RF-202: escribir una nota libre + vincular un caso real,
  guardar, confirmar que ambos persisten y que el `.html` exportado
  muestra ambos.
- RF-301 a RF-305: añadir 2 initiators y 2 respondents a un caso de
  prueba, guardar, confirmar en BD que hay 2+2 filas en `party`;
  confirmar que Facts Found/Decision muestran los 4 en
  `PartyReference`; confirmar que el `.html` exportado lista los 4 en
  la tabla de Parties; confirmar que el listado de casos
  (`CaseList.tsx`) los muestra todos, separados por coma; quitar una
  entrada sin guardar y confirmar que no se borra hasta pulsar Save;
  "Use suggested" (si hay extracción con candidato) añade sin
  sobrescribir las ya existentes.
- RF-401/RF-402/RF-403: escribir una fecha/hora en Decision, confirmar
  que aparece también en Review sin guardar; guardar; confirmar que el
  `.html` exportado la muestra.
- Revisión con el agente `reviewer`: QA de spec/plan antes de
  implementar, validación RF por RF después, verificación en vivo
  (localhost primero, luego confirmado contra el entorno desplegado —
  con especial atención a que la migración se aplique sola en el
  "Pull and redeploy").

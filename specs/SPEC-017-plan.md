# SPEC-017 — Plan

Relacionado: `SPEC-017-hearing-notes.md` (requisitos).

## 1. Backend — `apps/api/db/schema.sql`

```sql
CREATE TABLE IF NOT EXISTS protest_case (
  ...
  with_case_note TEXT,
  notes TEXT NOT NULL DEFAULT '', -- SPEC-017: free-form hearing notes, never exported
  ...
```

## 2. Backend — `apps/api/src/db/migrate.ts`

```ts
// SPEC-017: second real ALTER TABLE (first was with_case_note, SPEC-016).
const hasNotes = (db.prepare(`PRAGMA table_info(protest_case)`).all() as { name: string }[]).some(
  (c) => c.name === 'notes',
);
if (!hasNotes) {
  db.exec(`ALTER TABLE protest_case ADD COLUMN notes TEXT NOT NULL DEFAULT ''`);
  console.log('Migration: added protest_case.notes');
}
```

## 3. Backend — `apps/api/src/routes/index.ts`

```ts
registerCrud(app, 'cases', {
  table: 'protest_case',
  fields: [
    ...
    'with_case_note',
    'notes', // SPEC-017
    'procedural_matters',
    ...
  ],
  ...
});
```

## 4. Backend — `apps/api/src/ai/extractNotes.ts` (new file)

```ts
import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db/connection.js';

export interface NotesExtraction {
  procedural_matters_candidate: string;
  facts_found_candidates: string[];
  conclusion_candidate: string;
  decision_candidate: string;
}

interface PartyBoatRow {
  role: 'initiator' | 'respondent';
  sail_number: string | null;
}

// Mirrors extractFromAttachments (apps/api/src/ai/extract.ts) — same
// pipeline, Anthropic + JSON-only, same grounding rule (never invent) —
// but the source is this case's free-form hearing notes instead of an
// uploaded protest form, and the only output is candidates for the 4
// writing boxes (no parties/witnesses/day/race — that's the protest
// form's job, SPEC-017 scope).
export async function extractFromNotes(caseId: number, notes: string): Promise<NotesExtraction> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured on the server');
  if (!notes.trim()) throw new Error('no notes to process');

  const boats = db
    .prepare(
      `SELECT party.role, boat.sail_number
       FROM party LEFT JOIN boat ON boat.id = party.boat_id
       WHERE party.case_id = ?`,
    )
    .all(caseId) as unknown as PartyBoatRow[];
  const knownBoats = boats
    .filter((b) => b.sail_number)
    .map((b) => `${b.sail_number} (${b.role})`)
    .join(', ') || 'none registered yet';

  const prompt = [
    'A protest committee member wrote these free-form notes during a hearing:',
    '',
    notes,
    '',
    `Boats already registered on this case (resolve a shorthand sail number against this list only, e.g. "004" -> the one entry below ending in those digits — if it does not unambiguously match one of these, keep the note's original text instead of guessing): ${knownBoats}`,
    '',
    'Return JSON only, matching this exact shape (omit/empty a field if the notes have nothing for it — never invent):',
    JSON.stringify(
      {
        procedural_matters_candidate: 'string',
        facts_found_candidates: ['string'],
        conclusion_candidate: 'string',
        decision_candidate: 'string',
      },
      null,
      2,
    ),
  ].join('\n');

  const anthropic = new Anthropic({ apiKey });
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 2048,
    system:
      'You turn a protest committee member\'s shorthand hearing notes into draft material for ' +
      'a protest decision document, for the scribe to review and insert box by box. ' +
      'A sail number shorthand (e.g. "004") resolves ONLY against the boats list given — if it ' +
      'unambiguously matches exactly one entry, write the full sail number with its country ' +
      'prefix (e.g. "ITA 32004"); if it is ambiguous or matches none, leave the note\'s own ' +
      'wording as written rather than guessing. Never invent a boat, person, rule, or fact not ' +
      'in the notes. ' +
      'facts_found_candidates is a breakdown into individual discrete facts, one clause or ' +
      'event per entry, short and objective — same style as a protest form extraction\'s facts ' +
      'breakdown. procedural_matters_candidate/conclusion_candidate/decision_candidate are each ' +
      'a single short paragraph, only filled if the notes actually contain material for that ' +
      'box — most hearings\' notes will leave conclusion_candidate/decision_candidate empty, ' +
      'since those are usually decided after, not noted during, the hearing; never force ' +
      'something into them. ALWAYS write every field in English, even when the notes are in ' +
      'another language. Return ONLY the JSON object, no markdown code fence, no explanation.',
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  return parseNotesExtraction(text);
}

function parseNotesExtraction(text: string): NotesExtraction {
  const unfenced = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  let parsed: Partial<NotesExtraction>;
  try {
    parsed = JSON.parse(unfenced);
  } catch {
    const start = unfenced.indexOf('{');
    const end = unfenced.lastIndexOf('}');
    if (start === -1 || end <= start) throw new Error('extraction did not return valid JSON');
    try {
      parsed = JSON.parse(unfenced.slice(start, end + 1));
    } catch {
      throw new Error('extraction did not return valid JSON');
    }
  }
  return {
    procedural_matters_candidate: parsed.procedural_matters_candidate ?? '',
    facts_found_candidates: parsed.facts_found_candidates ?? [],
    conclusion_candidate: parsed.conclusion_candidate ?? '',
    decision_candidate: parsed.decision_candidate ?? '',
  };
}
```

(`parseNotesExtraction` duplicates the small fence-stripping routine
from `extract.ts` rather than sharing it — same reasoning the project
already applies elsewhere: a few lines of duplication beats a shared
helper for two call sites with slightly different shapes.)

## 5. Backend — `apps/api/src/routes/extractNotes.ts` (new file)

```ts
import type { FastifyInstance } from 'fastify';
import { extractFromNotes } from '../ai/extractNotes.js';

// Manual "Process" trigger (also fired automatically from the frontend
// on tab-switch into a writing box, SPEC-017 RF-004) — same shape as
// extract-attachments: never writes to the case, the scribe reviews
// and inserts each piece manually.
export function registerExtractNotesRoute(app: FastifyInstance) {
  app.post('/cases/:id/extract-notes', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { notes } = req.body as { notes?: string };
    try {
      return await extractFromNotes(Number(id), notes ?? '');
    } catch (e) {
      const message = (e as Error).message;
      const code = message.includes('no notes to process') ? 400 : 502;
      return reply.code(code).send({ error: message });
    }
  });
}
```

## 6. Backend — `apps/api/src/routes/index.ts` registration

```ts
import { registerExtractNotesRoute } from './extractNotes.js';
// ...
registerExtractAttachmentsRoute(app);
registerExtractNotesRoute(app); // SPEC-017
```

## 7. Frontend — `apps/web/src/types.ts`

```ts
export interface CaseRow {
  ...
  with_case_note: string | null;
  notes: string; // SPEC-017
  ...
}

export interface NotesExtraction {
  procedural_matters_candidate: string;
  facts_found_candidates: string[];
  conclusion_candidate: string;
  decision_candidate: string;
}
```

## 8. Frontend — `apps/web/src/api.ts`

```ts
extractNotes: (caseId: number, notes: string) =>
  post<NotesExtraction>(`/cases/${caseId}/extract-notes`, { notes }),
```

## 9. Frontend — `apps/web/src/components/SuggestionsPanel.tsx`

```ts
interface Props {
  caseId: number;
  box: PhraseBox;
  currentText: string;
  onInsert: (text: string) => void;
  protestForm?: ProtestFormSuggestion;
  notesForm?: ProtestFormSuggestion; // SPEC-017, same shape, new label
  partyReference?: PartyReferenceData;
}
```

```tsx
export function SuggestionsPanel({ caseId, box, currentText, onInsert, protestForm, notesForm, partyReference }: Props) {
  const hasProtestForm = !!protestForm && (!!protestForm.lines?.length || !!protestForm.paragraph);
  const hasNotesForm = !!notesForm && (!!notesForm.lines?.length || !!notesForm.paragraph);

  return (
    <div className="suggestions-panel">
      {partyReference && (...)}
      {hasProtestForm && (
        <CollapsibleSection title="Protest form">...</CollapsibleSection>
      )}
      {hasNotesForm && (
        <CollapsibleSection title="Hearing notes">
          <div className="suggestions-lines">
            {notesForm!.lines?.map((line, i) => (
              <button key={i} type="button" onClick={() => onInsert(line)}>
                + {line}
              </button>
            ))}
            {notesForm!.paragraph && (
              <button type="button" onClick={() => onInsert(notesForm!.paragraph!.text)}>
                + {notesForm!.paragraph.label}
              </button>
            )}
          </div>
        </CollapsibleSection>
      )}
      <CollapsibleSection title="Phrases">...</CollapsibleSection>
      ...
```

## 10. Frontend — `apps/web/src/components/CaseForm.tsx`

### 10a. State

```tsx
const [notes, setNotes] = useState('');
const [notesExtraction, setNotesExtraction] = useState<NotesExtraction | null>(null);
const [notesProcessing, setNotesProcessing] = useState(false);
const lastProcessedNotes = useRef('');
// Synchronous in-flight guard — notesProcessing (state) updates
// asynchronously, so two tab switches in the same tick could both
// still see notesProcessing === false and both fire. This ref is set
// true/false synchronously inside handleProcessNotes itself.
const processingRef = useRef(false);
```

### 10b. `reload()` gains

```tsx
setNotes(full.notes ?? '');
lastProcessedNotes.current = full.notes ?? ''; // SPEC-017: arms the auto-trigger
// at the ALREADY-SAVED value, not '' — opening a case with existing
// notes and switching tabs never fires an AI call on its own; only
// editing the notes in this session re-arms it.
```

(No scoped-refresh function touches `notes` — same reasoning as
`informedAt`/`withCaseNote`: only `reload()` on mount and
`handleSaveAll`'s own PATCH, never silently re-seeded.)

### 10c. `handleSaveAll`'s PATCH gains

```tsx
notes, // SPEC-017 — NOT NULL DEFAULT '', sent as-is like the four writing boxes
```

### 10d. Process handler

```tsx
async function handleProcessNotes() {
  if (!notes.trim() || processingRef.current) return;
  processingRef.current = true;
  setNotesProcessing(true);
  try {
    setNotesExtraction(await api.extractNotes(caseId, notes));
    lastProcessedNotes.current = notes;
    setError(null);
  } catch (e) {
    setError((e as Error).message);
  } finally {
    processingRef.current = false;
    setNotesProcessing(false);
  }
}
```

### 10e. Auto-trigger on tab switch

```tsx
useEffect(() => {
  const writingTabs: CaseTab[] = ['procedural', 'facts', 'conclusion', 'decision'];
  if (writingTabs.includes(caseTab) && notes.trim() && notes !== lastProcessedNotes.current) {
    handleProcessNotes();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [caseTab]);
```

### 10f. JSX — Notes box, between `.case-header`/error and `.tab-bar-row`

```tsx
{error && <p className="error">{error}</p>}

<section className="box">
  <h2>Hearing notes</h2>
  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
  <button type="button" onClick={handleProcessNotes} disabled={notesProcessing || !notes.trim()}>
    {notesProcessing ? 'Processing…' : 'Process'}
  </button>
</section>

<div className="tab-bar-row">
```

### 10g. `notesForm` prop on the 4 writing-box `<SuggestionsPanel>` calls

Procedural Matters:

```tsx
notesForm={
  notesExtraction?.procedural_matters_candidate
    ? { paragraph: { label: 'From hearing notes', text: notesExtraction.procedural_matters_candidate } }
    : undefined
}
```

Facts Found:

```tsx
notesForm={{ lines: notesExtraction?.facts_found_candidates }}
```

Conclusion:

```tsx
notesForm={
  notesExtraction?.conclusion_candidate
    ? { paragraph: { label: 'From hearing notes', text: notesExtraction.conclusion_candidate } }
    : undefined
}
```

Decision:

```tsx
notesForm={
  notesExtraction?.decision_candidate
    ? { paragraph: { label: 'From hearing notes', text: notesExtraction.decision_candidate } }
    : undefined
}
```

## 11. Frontend — `apps/web/src/format.ts`

No change — `notes` is deliberately excluded from `formatFullDecision`/
`formatFullDecisionHtml` (RF-009).

## Verificación

- `npm run build` (api) / `npm run typecheck` (web) limpios.
- Migración: misma prueba de idempotencia que SPEC-016 (copia de la
  BD real, correr `migrate` dos veces).
- RF-001/002: caja Notes visible en cualquier pestaña; texto
  sobrevive a recargar tras Save.
- RF-003/RF-004: botón Process deshabilitado sin texto; escribir notas
  (con un número de vela abreviado real de un caso de prueba),
  cambiar a Facts Found sin pulsar Process — confirma que se dispara
  solo; volver a cambiar de pestaña sin tocar las notas — confirma que
  NO se repite la llamada.
- RF-005: con un caso de prueba con un initiator/respondent real,
  confirmar que un número abreviado se resuelve al sail number
  completo; con un número que no coincide con ningún barco del caso,
  confirmar que se deja tal cual.
- RF-006: confirmar que el resultado está en inglés aunque la nota de
  prueba se escriba en español.
- RF-007: confirmar que, tras un Process con contenido para varias
  cajas, "Hearing notes" aparece en las 4 pestañas de redacción que
  tengan candidato, no en una sola.
- RF-008: ningún candidato se inserta sin pulsar su botón.
- RF-009: el texto de notas no aparece en el `.html` exportado.
- Revisión con el agente `reviewer`: QA de spec/plan antes de
  implementar, validación RF por RF después, verificación en vivo
  (localhost primero, luego confirmado contra el entorno desplegado).

# SPEC-010 — Plan

Relacionado: `SPEC-010-general.md` (requisitos).

## RF-007/RF-008 — Backend: `day_candidate`/`race_candidate`

`apps/api/src/ai/extract.ts`:

**Interface** (líneas 5-17), añadir dos campos:

```ts
export interface AttachmentExtraction {
  parties: {
    initiator?: { sail_number?: string; boat_name?: string; represented_by?: string };
    respondent?: { sail_number?: string; boat_name?: string; represented_by?: string };
  };
  witnesses: { full_name: string; role?: string }[];
  day_candidate: string;
  race_candidate: string;
  procedural_matters_candidate: string;
  facts_found_candidate: string;
  facts_found_candidates: string[];
  conclusion_candidate: string;
  decision_candidate: string;
  rule_citations_candidate: string[];
}
```

**Shape JSON del prompt** (líneas 56-69), añadir junto a `witnesses`:

```ts
witnesses: [{ full_name: 'string', role: 'string' }],
day_candidate: 'the calendar date of the day the incident/protest happened, exactly as the form writes it',
race_candidate: 'the race number or label exactly as the form gives it, e.g. "1", "Race 3", "R3"',
procedural_matters_candidate: 'string',
```

**`system` prompt** (líneas 79-112), insertar como frase propia después
del párrafo de `boat_name` (línea 93) y antes del de
`facts_found_candidate` (línea 94):

```ts
'day_candidate is the calendar date of the day the incident/protest ' +
'happened — the day being protested, not the day the form was filled ' +
'in or submitted, if the form shows both and they differ. Keep the ' +
'date exactly as the form writes it; do not reformat it into a ' +
'different date style and do not invent one. race_candidate is the ' +
'race number or label exactly as the form gives it (e.g. "1", "Race ' +
'3", "R3") — keep letters and numbers exactly as given, same as ' +
'everywhere else. Omit day_candidate/race_candidate entirely if the ' +
'form does not state them — never guess or invent. ' +
```

**`parseExtraction`** (líneas 147-156), añadir junto a `witnesses`:

```ts
return {
  parties: parsed.parties ?? {},
  witnesses: parsed.witnesses ?? [],
  day_candidate: parsed.day_candidate ?? '',
  race_candidate: parsed.race_candidate ?? '',
  procedural_matters_candidate: parsed.procedural_matters_candidate ?? '',
  ...
};
```

## `apps/web/src/types.ts` — mismo par de campos

`AttachmentExtraction` (líneas 97-109), mismo cambio que arriba, a
mano (sin paquete de tipos compartido entre `api`/`web`, confirmado
preexistente). No hace falta tocar `api.ts` — `extractAttachments` ya
devuelve `AttachmentExtraction` completo.

## RF-001/RF-002/RF-003/RF-004 — `CaseForm.tsx`

Dos cambios: (a) funciones de sugerencia nuevas, (b) JSX del bloque
`caseTab === 'general'` reestructurado.

**(a)** Junto a `useSuggestedParty` (línea 356-365), añadir:

```tsx
function useSuggestedDay() {
  if (extraction?.day_candidate) setDay(extraction.day_candidate);
}

function useSuggestedRace() {
  if (extraction?.race_candidate) setRace(extraction.race_candidate);
}
```

**(b)** Sustituir el bloque actual (líneas 526-681: el
`{caseTab === 'general' && (...)}` completo) por dos secciones
hermanas dentro del mismo `tab-panel` — la caja "General" nueva,
**separada** del `CopyBox` de Parties & Witness (decisión explícita
del usuario: apartado propio, no fusionado):

```tsx
{caseTab === 'general' && (
  <div className="tab-panel">
    <section className="box general-box">
      <h2>General</h2>
      <form onSubmit={handleSaveGeneral} className="general-fields-row">
        <label>
          Case number
          <input value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} required />
        </label>
        <label>
          Day
          <input value={day} onChange={(e) => setDay(e.target.value)} />
        </label>
        {extraction?.day_candidate && (
          <button type="button" onClick={useSuggestedDay}>
            Use suggested
          </button>
        )}
        <label>
          Race
          <input value={race} onChange={(e) => setRace(e.target.value)} />
        </label>
        {extraction?.race_candidate && (
          <button type="button" onClick={useSuggestedRace}>
            Use suggested
          </button>
        )}
        <label>
          With case(s)
          <div className="with-case-inline">
            {caseFull.linkedCases.map((lc) => (
              <span key={lc.id} className="chip">
                {lc.case_number}
                <button type="button" onClick={() => handleRemoveLink(lc.id)} aria-label={`Unlink case ${lc.case_number}`}>
                  ×
                </button>
              </span>
            ))}
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) handleLinkCase(Number(e.target.value));
              }}
            >
              <option value="">+ Link case…</option>
              {otherCases
                .filter((c) => !caseFull.linkedCases.some((lc) => lc.id === c.id))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    Case {c.case_number}
                  </option>
                ))}
            </select>
          </div>
        </label>
        <button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
    </section>

    {/* Parties & Witness — sin cambios, misma CopyBox de siempre. */}
    <CopyBox
      label="Parties & Witness"
      text={`${formatParties(liveCase)}\n\n${formatWitnesses(liveCase)}`}
      copied={!!copied.parties && !!copied.witness}
      onCopied={() => {
        markCopied('parties');
        markCopied('witness');
      }}
    >
      {/* ... contenido actual sin cambios (Parties/Witness, líneas 594-678) ... */}
    </CopyBox>
  </div>
)}
```

`informed_at`/`setInformedAt` desaparecen de este JSX — el `useState`
(línea 66), su seed en `reload()` (línea 126:
`setInformedAt(full.informed_at ?? '')`) y su uso en
`handleSaveGeneral` (línea 245:
`informed_at: informedAt.trim() || null`) **no se tocan**: siguen
viajando tal cual, solo que ningún input los expone ya.
`handleSaveGeneral` no necesita ningún otro cambio — no referencia
nada del DOM, solo los `useState` ya existentes.

## CSS — `apps/web/src/styles.css`

Eliminar (ya sin ningún uso tras el cambio anterior):

```css
.case-meta { ... }
.case-meta label { ... }
.case-meta input { ... }
```

Añadir, reusando los tokens ya existentes del sistema de diseño
(`var(--line)`, `var(--ink-soft)`, etc. — mismo criterio que el resto
de componentes tras la pasada de rediseño):

```css
.general-box h2 {
  margin-bottom: 8px;
}

.general-fields-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: end;
}

.general-fields-row label {
  display: flex;
  flex-direction: column;
  font-size: 0.8em;
  color: var(--ink-soft);
  gap: 2px;
}

.general-fields-row input {
  padding: 4px 6px;
}
```

`.with-case-inline`, `.chip`, `.chip button` se reutilizan tal cual
(genéricos, no dependían de `.case-meta`). El botón "Use suggested"
no necesita clase nueva — mismo botón sin clase que ya usa
`party-row` (línea 619-623).

## Orden de ejecución

1. Backend (`extract.ts`) — `day_candidate`/`race_candidate` en
   interface, shape del prompt, `system` prompt, `parseExtraction`.
   Verificable en aislado con `npm run build` (api).
2. `apps/web/src/types.ts` — mismo par de campos.
3. `CaseForm.tsx` — funciones `useSuggestedDay`/`useSuggestedRace`;
   reestructura del bloque `caseTab === 'general'` (caja "General"
   nueva separada, quita `.case-meta`, quita `informed_at` de la UI).
4. `styles.css` — quita `.case-meta*`, añade `.general-box`/
   `.general-fields-row*`.
5. `npm run typecheck` (web) / `npm run build` (api) limpios.
6. Verificación en vivo + reviewer.

## Verificación

- Visual: pestaña "1. General & Parties" muestra dos cajas separadas
  — "General" (Case number/Day/Race/With case(s)/Save) arriba, Parties
  & Witness debajo, ambas con el mismo tratamiento visual del resto de
  la app (`.box`); ningún campo "Informed at" visible en ningún sitio.
- Guardado batcheado sin cambio de comportamiento: editar Case number,
  Day, Race, un party y un witness sin recargar; With case(s) ya
  vinculado al instante (sin esperar a Save); pulsar Save una vez;
  recargar página → todo persistido junto, exactamente igual que hoy.
- `informed_at` no regresiona: un caso con valor ya guardado antes de
  este cambio lo sigue mostrando igual en el `.html` exportado
  (`format.ts:210`) tras pulsar Save.
- IA — caso de prueba con un protest form subido que declare
  explícitamente un día de regata distinto a su fecha de presentación,
  y un número de prueba:
  - "0. Protest Form(s)" → Process.
  - "1. General & Parties": si Day/Race están vacíos, aparecen los
    botones "Use suggested" junto a cada uno; al pulsarlos, el campo
    se rellena con el valor correcto (fecha de la regata, nunca la de
    presentación del formulario).
  - Caso de prueba sin esa información en el formulario: tras Process,
    ningún botón "Use suggested" aparece junto a Day/Race (candidato
    vacío por omisión del modelo, nunca inventado).
- Revisión con el agente `reviewer`: primero QA de
  `SPEC-010-general.md`/`SPEC-010-plan.md`/`SPEC-010-tasks.md` antes
  de construir, luego validación RF por RF tras implementar — mismo
  cierre que SPEC-009.

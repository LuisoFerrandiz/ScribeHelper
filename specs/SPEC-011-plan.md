# SPEC-011 — Plan

Relacionado: `SPEC-011-general-parties-split.md` (requisitos).

## RF-001/RF-003 — `CaseTab` y barra de pestañas

`CaseForm.tsx:107`, el union gana un miembro:

```ts
type CaseTab =
  | 'attachments' | 'general' | 'parties' | 'procedural' | 'facts'
  | 'conclusion' | 'decision' | 'review';
```

Barra de pestañas — un botón nuevo tras "1. General", renumeración +1
desde ahí (mismo patrón `className={caseTab === X ? 'active' : undefined}`
que ya usan todos los botones existentes):

```
0. Protest Form(s)    caseTab 'attachments'   (sin cambio)
1. General             caseTab 'general'       (ya no "General & Parties")
2. Parties & Witness   caseTab 'parties'       (NUEVO)
3. Procedural Matters  caseTab 'procedural'    (antes "2.")
4. Facts Found         caseTab 'facts'         (antes "3.")
5. Conclusion          caseTab 'conclusion'    (antes "4.")
6. Decision            caseTab 'decision'      (antes "5.")
7. Review              caseTab 'review'        (antes "6.")
```

## RF-004/RF-006 — `saving`: de `boolean` a `Record<string, boolean>`

`CaseForm.tsx:59`:

```ts
const [saving, setSaving] = useState<Record<string, boolean>>({});
```

Mismo patrón que `copied` (línea 60, ya `Record<string, boolean>`).
Claves: `general`, `parties`, `procedural`, `facts`, `conclusion`,
`decision`, `review` — cada botón lee/escribe solo la suya.

## RF-004 — `saveField`, helper genérico (sustituye el cuerpo de `handleSaveGeneral` para los casos de un solo PATCH)

Junto a `savePartyRole` (línea 214):

```ts
// Guardado de UI genérico para un solo PATCH de updateCase, con su
// propia clave en `saving`. Nunca toca `caseFull` ni ningún otro
// useState — para los campos que usa (los 4 cuadros de texto y
// General) el estado local YA es la fuente de verdad que `liveCase`
// (línea ~381) y el export .html leen. Si un guardado futuro
// necesitara refresco, debe escribir el suyo propio acotado (como
// refreshParties más abajo), nunca llamar aquí a reload().
async function saveField(key: string, patch: Partial<CaseRow>) {
  setSaving((prev) => ({ ...prev, [key]: true }));
  try {
    await api.updateCase(caseId, patch);
    setError(null);
  } catch (e) {
    setError((e as Error).message);
  } finally {
    setSaving((prev) => ({ ...prev, [key]: false }));
  }
}
```

(`CaseRow` ya está importado, línea 19.)

## RF-004 — Los 6 handlers de guardado (sustituyen `handleSaveGeneral`, líneas 237-272)

```ts
// "1. General" — solo case_number/day/race/informed_at. informed_at
// sigue sin UI (SPEC-010) pero viaja igual en el payload, sin cambio
// de comportamiento.
function handleSaveGeneral(e: FormEvent) {
  e.preventDefault();
  saveField('general', {
    case_number: caseNumber.trim(),
    day: day.trim() || null,
    race: race.trim() || null,
    informed_at: informedAt.trim() || null,
  });
}

// "2. Parties & Witness" — único handler que SÍ necesita refresco tras
// guardar (ver refreshParties abajo); no usa saveField. Reconciliación
// de testigos idéntica a la que tenía el handleSaveGeneral anterior.
async function handleSaveParties() {
  setSaving((prev) => ({ ...prev, parties: true }));
  try {
    await savePartyRole('initiator');
    await savePartyRole('respondent');

    const keptIds = new Set(witnessDraft.filter((w) => w.id !== null).map((w) => w.id));
    for (const w of caseFull?.witnesses ?? []) {
      if (!keptIds.has(w.id)) await api.deleteWitness(w.id);
    }
    for (const w of witnessDraft) {
      if (w.id === null && w.fullName.trim()) {
        const personId = await findOrCreatePerson(w.fullName.trim());
        await api.createWitness({ case_id: caseId, person_id: personId, role: w.role.trim() || null });
      }
    }

    await refreshParties();
    setError(null);
  } catch (e) {
    setError((e as Error).message);
  } finally {
    setSaving((prev) => ({ ...prev, parties: false }));
  }
}

// "3. Procedural Matters"
function handleSaveProcedural() {
  saveField('procedural', { procedural_matters: proceduralMatters });
}

// "4. Facts Found"
function handleSaveFacts() {
  saveField('facts', { facts_found: factsFound });
}

// "5. Conclusion" — solo el texto; Rules Applicable sigue guardando al
// instante vía handleAddRule/handleRemoveRule, sin cambios.
function handleSaveConclusion() {
  saveField('conclusion', { conclusion });
}

// "6. Decision"
function handleSaveDecision() {
  saveField('decision', { decision });
}

// "7. Review" — guarda las 4 cajas juntas en un solo PATCH, es "toda
// la información de esta pestaña".
function handleSaveReview() {
  saveField('review', {
    procedural_matters: proceduralMatters,
    facts_found: factsFound,
    conclusion,
    decision,
  });
}
```

## RF-002 — `refreshParties()`, nueva (junto a `reloadJury()`, líneas 157-163)

```ts
// Refresca SOLO parties/witnesses (y lo derivado: initiator/
// respondent/witnessDraft) — nunca caseNumber/day/race/informedAt ni
// los 4 useState de texto libre (mismo criterio que reloadJury,
// precedente SPEC-009 RF-007). Testigos nuevos obtienen un id del
// servidor que el draft local no tiene hasta este punto;
// findOrCreateBoat/findOrCreatePerson ya mantienen boats/people al
// día por su cuenta, no hace falta recargarlos.
async function refreshParties() {
  const full = await api.getCaseFull(caseId);
  setCaseFull((prev) => (prev ? { ...prev, parties: full.parties, witnesses: full.witnesses } : full));

  const i = full.parties.find((p) => p.role === 'initiator');
  const r = full.parties.find((p) => p.role === 'respondent');
  setInitiator({
    sailNumber: i?.sail_number ?? '',
    boatName: i?.boat_name ?? '',
    representedBy: i?.represented_by ?? '',
  });
  setRespondent({
    sailNumber: r?.sail_number ?? '',
    boatName: r?.boat_name ?? '',
    representedBy: r?.represented_by ?? '',
  });
  setWitnessDraft(full.witnesses.map((w) => ({ id: w.id, fullName: w.full_name, role: w.role ?? '' })));
}
```

`reload()` (líneas 110-151) no cambia — sigue siendo el reload inicial
(`useEffect` al montar/cambiar `caseId`) y lo que usan
`handleLinkCase`/`handleRemoveLink`/`handleUploadAttachment`/
`handleRemoveAttachment`/`handleAddRule`/`handleRemoveRule` (fuera de
alcance de esta spec — ver "Hallazgo colateral" en la spec de
requisitos).

## RF-001/RF-002 — `CopyBox.tsx`, prop `onSave?`/`saving?`

```tsx
interface CopyBoxProps {
  label: string;
  text: string;
  copied: boolean;
  onCopied: () => void;
  children: ReactNode;
  onSave?: () => void;
  saving?: boolean;
}

export function CopyBox({ label, text, copied, onCopied, children, onSave, saving }: CopyBoxProps) {
  // handleCopy/collapsed sin cambios
  return (
    <section className={`box${copied ? ' box-copied' : ''}${collapsed ? ' box-collapsed' : ''}`}>
      <div className="box-header">
        <button type="button" className="box-collapse-toggle" onClick={() => setCollapsed((c) => !c)} aria-expanded={!collapsed} aria-label={collapsed ? `Expand ${label}` : `Collapse ${label}`}>
          <span className="box-collapse-chevron">▾</span>
          <h2>
            {label}
            {copied && <span className="copied-badge"> ✓ Copied</span>}
          </h2>
        </button>
        <div className="box-header-actions">
          {onSave && (
            <button type="button" onClick={onSave} disabled={!!saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          )}
          <button type="button" onClick={handleCopy}>
            Copy
          </button>
        </div>
      </div>
      <div className="box-body" hidden={collapsed}>
        {children}
        {failed && <p className="error">Copy failed. Select and copy manually.</p>}
      </div>
    </section>
  );
}
```

Cajas que no pasan `onSave` (Rules Applicable) quedan exactamente
igual — el wrapper `box-header-actions` solo contiene "Copy".

## RF-002/RF-004 — Uso en las 5 cajas con Save

```tsx
<CopyBox
  label="Parties & Witness"
  text={...}
  copied={...}
  onCopied={...}
  onSave={handleSaveParties}
  saving={!!saving.parties}
>
```

Igual para Procedural Matters (`handleSaveProcedural`/
`saving.procedural`), Facts Found (`handleSaveFacts`/`saving.facts`),
Conclusion (`handleSaveConclusion`/`saving.conclusion`), Decision
(`handleSaveDecision`/`saving.decision`). Rules Applicable no recibe
`onSave`.

## RF-001 — JSX de "1. General" (nuevo bloque, separado de Parties & Witness)

Sustituye el `caseTab === 'general'` actual (líneas 526-681) por dos
bloques. El de "General":

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
          {/* ... contenido actual sin cambios ... */}
        </label>
        <button type="submit" disabled={!!saving.general}>
          {saving.general ? 'Saving…' : 'Save'}
        </button>
      </form>
    </section>
  </div>
)}
```

(Idéntico al bloque "General" de SPEC-010, solo cambia el botón Save
para leer `saving.general` en vez del `saving` booleano antiguo.)

## RF-002 — JSX de "2. Parties & Witness" (bloque nuevo)

```tsx
{caseTab === 'parties' && (
  <div className="tab-panel">
    <CopyBox
      label="Parties & Witness"
      text={`${formatParties(liveCase)}\n\n${formatWitnesses(liveCase)}`}
      copied={!!copied.parties && !!copied.witness}
      onCopied={() => {
        markCopied('parties');
        markCopied('witness');
      }}
      onSave={handleSaveParties}
      saving={!!saving.parties}
    >
      {/* ... contenido actual sin cambios (Parties/Witness, líneas 594-678) ... */}
      {/* se elimina el <p className="muted">Parties and witnesses save
          with the Save button above.</p> — ya no hay "botón de arriba",
          está en la cabecera de esta misma caja */}
    </CopyBox>
  </div>
)}
```

## RF-007 — JSX de "7. Review" (cabecera con Save nueva)

```tsx
{caseTab === 'review' && (
  <div className="tab-panel">
    <section className="box review-box">
      <div className="box-header">
        <h2>Review</h2>
        <button type="button" onClick={handleSaveReview} disabled={!!saving.review}>
          {saving.review ? 'Saving…' : 'Save'}
        </button>
      </div>
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

Reusa `.box-header` ya existente (`flex; justify-content: space-between`).

## CSS — `apps/web/src/styles.css`

```css
.box-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
```

Nada se elimina — `.tab-bar-pill`, `.general-fields-row`, `.box-header`,
`.inline-form`, `.review-box` se reutilizan tal cual.

## Orden de ejecución

1. `CopyBox.tsx` — prop `onSave`/`saving` + wrapper `box-header-actions`
   (cambio aislado; ningún `CopyBox` existente pasa la prop todavía,
   cero cambio visible, verificable con `npm run typecheck` solo).
2. `styles.css` — `.box-header-actions`.
3. `CaseForm.tsx` — `CaseTab` union + botón de pestaña nuevo +
   renumeración de etiquetas (sin mover JSX de contenido todavía).
4. `CaseForm.tsx` — `saving` a `Record<string, boolean>`, `saveField`,
   `refreshParties`, los 6 handlers (sustituyen `handleSaveGeneral`).
5. `CaseForm.tsx` — mover el JSX: separar `caseTab === 'general'` en
   `'general'` (sin `CopyBox`) y `'parties'` (nuevo, con el `CopyBox`);
   añadir `onSave`/`saving` a los 5 `CopyBox` con Save; añadir cabecera
   Save a `'review'`.
6. `npm run typecheck` (web) limpio.
7. Verificación en vivo + reviewer.

## Verificación

Caso de prueba: cualquier caso existente con al menos un party y un
witness ya guardados (p. ej. TEST-01).

- Visual: 8 pestañas (0 a 7) renumeradas; "1. General" sin ningún
  `CopyBox`; "2. Parties & Witness" con botón "Save" junto a "Copy" en
  su cabecera.
- **RF-005, el escenario que ya mordió una vez (repetido a propósito,
  precedente SPEC-009 RF-007):**
  1. "4. Facts Found": escribir texto nuevo, NO pulsar Save.
  2. "3. Procedural Matters": escribir otro texto, pulsar su Save →
     recargar página, confirma que persistió.
  3. Volver a "4. Facts Found" (sin recargar tras el paso 2) → el
     texto sin guardar del paso 1 sigue intacto.
  4. Recargar la página de verdad → Facts Found vuelve a su último
     valor guardado (el texto del paso 1 se pierde, esperado — nunca
     se guardó).
- Repetir cruzando "1. General" (editar Case number sin guardar)
  contra "2. Parties & Witness" (editar un party, pulsar su Save) —
  Case number sin guardar sobrevive.
- "2. Parties & Witness": añadir un testigo, pulsar Save → id real
  asignado (quitar y re-añadir no duplica; recarga lo conserva).
  Combinar con texto sin guardar en "5. Conclusion" en paralelo — tras
  guardar Parties & Witness, Conclusion sigue con el texto sin
  guardar.
- "7. Review": escribir en una caja desde Review, pulsar su Save →
  persiste igual que si se hubiera guardado desde la pestaña
  individual (recargar confirma). Guardar desde "6. Decision" y
  comprobar que Review, al visitarla, muestra el mismo valor (mismo
  `useState`, sin refresco necesario).
- "Rules Applicable" y "With case(s)" — sin Save propio, siguen
  actuando al instante, sin cambios.
- `npm run typecheck` (web) limpio.
- Revisión con el agente `reviewer` antes de marcar como terminado.

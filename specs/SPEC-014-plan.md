# SPEC-014 — Plan

Relacionado: `SPEC-014-unified-save.md` (requisitos).

## 1. `CaseForm.tsx` — estado

Sustituir:

```tsx
const [saving, setSaving] = useState<Record<string, boolean>>({});
```

por:

```tsx
const [savingAll, setSavingAll] = useState(false);
```

## 2. `CaseForm.tsx` — `handleSaveAll` (sustituye `saveField` +
`handleSaveGeneral` + `handleSaveParties` + `handleSaveProcedural` +
`handleSaveFacts` + `handleSaveConclusion` + `handleSaveDecision` +
`handleSaveReview`)

```tsx
async function handleSaveAll() {
  setSavingAll(true);
  try {
    await api.updateCase(caseId, {
      case_number: caseNumber.trim(),
      day: day.trim() || null,
      race: race.trim() || null,
      informed_at: informedAt.trim() || null,
      procedural_matters: proceduralMatters,
      facts_found: factsFound,
      conclusion,
      decision,
    });

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
    setSavingAll(false);
  }
}
```

(El cuerpo de Parties/testigos es exactamente el que ya tenía
`handleSaveParties` — se mueve tal cual, no se reescribe su lógica.)

## 3. `CaseForm.tsx` — botón nuevo junto a Download decision

```tsx
        <button type="button" className="btn-accent" onClick={handleDownload}>
          Download decision (.html)
        </button>
        <button type="button" className="btn-accent" onClick={handleSaveAll} disabled={savingAll}>
          {savingAll ? 'Saving…' : 'Save'}
        </button>
      </div>
```

## 4. `CaseForm.tsx` — sección "General"

`<form onSubmit={handleSaveGeneral} className="general-fields-row">`
pasa a `<div className="general-fields-row">` (ya no es un form con
submit propio — With case(s)/Day/Race siguen siendo inputs
controlados normales, nada cambia en su comportamiento salvo que
Enter ya no dispara un submit). Se quita el `<button type="submit">`
final.

## 5. `CaseForm.tsx` — `CopyBox` de "Parties & Witness"

Se quitan `onSave={handleSaveParties}` y `saving={!!saving.parties}`.

## 6. `CaseForm.tsx` — los 4 `CopyBox` de texto libre

Cada uno pierde `onSave={handleSaveX}` y `saving={!!saving.x}`
(Procedural Matters, Facts Found, Conclusion, Decision).

## 7. `CaseForm.tsx` — pestaña "Review"

El `box-header` con el botón Save se simplifica a un `<h2>` normal
(ya no necesita cabecera con acción):

```tsx
<section className="box review-box">
  <h2>Review</h2>
  <h3>Procedural Matters</h3>
  ...
```

## 8. `CopyBox.tsx`

Se quitan los props `onSave`/`saving` de `CopyBoxProps` y del render
(vuelve al único botón "Copy" en `.box-header-actions`, o se puede
simplificar `.box-header-actions` a un solo botón directo si ya no
hace falta el wrapper — decisión menor de implementación, sin impacto
visible).

## 9. CSS

Revisar si `.box-header-actions` sigue necesitando ser un flex
container de 2 elementos o puede simplificarse — cambio cosmético
opcional, no bloqueante.

## Verificación

- `npm run typecheck` (web) limpio.
- RF-001/002/003/004: visual — un solo botón Save junto a Download
  decision, visible en cualquier pestaña; ninguna pestaña conserva su
  propio Save; pulsar el único Save persiste General + Parties &
  Witness (incluyendo testigo nuevo) + las 4 cajas de texto, todo
  verificado recargando la página después.
- RF-006: Rules Applicable, With case(s), adjuntos, jurado sin
  regresión (siguen actuando al instante).
- Revisión con el agente `reviewer`: QA de spec/plan antes de
  implementar, validación RF por RF después, verificación en vivo
  (localhost primero, luego confirmado contra el entorno desplegado).

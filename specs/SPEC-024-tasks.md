# SPEC-024 — Tareas

Estado (2026-10-14): pasos 1a a 3b hechos, desplegados y verificados;
quedan 3c, 3d, 3e y 4 (y 5 solo a petición). `CaseForm.tsx`: 1091 → 866
líneas. Cada paso termina en commit, push, redeploy del dueño y comparación
de DOM contra la línea base (TEST-01 y TEST-02; Parties & Witness con el
valor actualizado, ver el plan).

Relacionado: `SPEC-024-refactor-caseform.md`, `SPEC-024-plan.md`.

- [x] **1a. `caseTabs.ts` + `TabBar.tsx`** — `57568d9`. Verificado.
- [x] **1b. `caseDrafts.ts`** — `9fabdf2`. Verificado (carga y Save con testigo).
- [x] **1c. `refreshCasePart`** (jury, linkedCases, attachments,
  ruleCitations; `refreshParties` aparte) — `82ec59e`. Verificado (los cuatro
  refrescos no pisan texto sin guardar).
- [x] **2a. `ReviewTab.tsx`** — `dada6d0`. Verificado.
- [x] **2b. `GeneralTab.tsx`** — `5e86954`. Verificado.
- [x] **2c. `AttachmentsTab.tsx`** — `af52c66`. Verificado.
- [x] **3a. `WritingBox.tsx` + Procedural Matters** — `6d0fde1`. Verificado
  (escritura real sin remontaje, texto fantasma, inserción, colapso).
- [x] **3b. Conclusion** — `56de037`. Verificado.
- [ ] **3c. Facts Found.** `WritingBox` con `textarea` = `GhostTextarea`
  (`rows={6}`, `sailNumberRoles`) y `side` = `div.suggestions-panel` con
  `PartyReference` (sin `race`) + `SuggestionList` (líneas del formulario y
  de las notas). `useMemo` de `sailNumberRoles` se queda en el padre.
  Comprobación extra: el texto fantasma determinista de número de vela
  (`(initiator)` / `(respondent)`).
- [ ] **3d. Decision.** `section.box` con "Informed at" **antes** del
  `WritingBox`, dentro del mismo `tab-panel`; `side` = `div.suggestions-panel`
  con `PartyReference` **con `race`** + `SuggestionList`.
- [ ] **3e. Rules Applicable.** `copyText` = `formatRulesApplicable(liveCase)`
  (no el texto crudo); `GhostTextarea` `rows={6}`; `side` =
  `RulesSuggestions` directo (sin `suggestions-panel`); `onInsertMissing`
  lee `liveCase` en el momento del clic. No tocar `handleAddRule` más allá de
  pasarlo (SPEC-022).
- [ ] **4. `PartiesTab.tsx`** — `CopyBox` (no `WritingBox`: no usa
  `box-body-split`) con las tres `datalist`; `copyText` =
  `formatParties` + `\n\n` + `formatWitnesses`; dos claves de `copied`
  (`parties` y `witness`); todo el estado (`partyDrafts`, `partyForm`,
  `witnessDraft`, `witnessName/Role`) en el padre.
- [ ] **5. (solo a petición del dueño) hooks en el padre:**
  `useNotesExtraction` y `useCaseSave`. Riesgo alto.
- [ ] **6. Cierre:** actualizar `issue.md` (ISS-006), entrada en
  `DECISIONS.md` (política de refactor y estructura de componentes) y
  revisar si la sección de arquitectura de `CLAUDE.md` necesita mencionarlo.

Cada tarea 3c-4: `typecheck` + `build`, `git diff -w` (solo debe cambiar el
envoltorio), commit, push, redeploy del dueño, comparación de DOM (18
hashes) y comprobación de comportamiento de la pestaña tocada.

## Anotado durante la verificación (fuera del refactor)

- El texto fantasma de Conclusion devolvió una respuesta del modelo en lugar
  de una continuación ("I'm ready to help continue…") ante un texto sin
  sentido. Defecto previo de `ai/complete.ts` (no filtra respuestas
  meta). No se arregla aquí.
- Queda la persona de prueba "ZZ Refactor Test" en la lista de personas
  (no hay forma de borrarla desde la app).

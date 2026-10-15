# SPEC-024 — Tareas

Estado (2026-10-15): **CERRADA.** Pasos 1a a 4 hechos, desplegados y verificados;
el paso 5 (hooks) queda descartado por decisión del dueño (la ganancia, ~200
líneas, no compensa el riesgo sobre el guardado; no es necesario para cumplir
la intención de la spec). `CaseForm.tsx`: 1091 →
758 líneas (−333); los componentes nuevos suman ~800 líneas. Cada paso
terminó en commit, push, redeploy del dueño y comparación de DOM contra la línea base (TEST-01 y TEST-02; Parties & Witness con el
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
- [x] **3c. Facts Found** — `052e813`. Verificado (texto fantasma por número de
  vela, `PartyReference` resaltado, escritura real sin remontaje).
  `WritingBox` con `textarea` = `GhostTextarea` (`rows={6}`, `sailNumberRoles`)
  y `side` = `div.suggestions-panel` con `PartyReference` (sin `race`) +
  `SuggestionList`; el `useMemo` de `sailNumberRoles` se queda en el padre.
- [x] **3d. Decision** — `4cb38ff`. Verificado. `section.box` con "Informed at"
  **antes** del `WritingBox`, dentro del mismo `tab-panel`; `side` =
  `div.suggestions-panel` con `PartyReference` **con `race`** + `SuggestionList`.
- [x] **3e. Rules Applicable** — `fc9d7fc`. Verificado (escritura, citas, aviso
  "Insert missing"). `copyText` = `formatRulesApplicable(liveCase)`;
  `GhostTextarea` `rows={6}`; `side` = `RulesSuggestions` directo;
  `onInsertMissing` lee `liveCase` en el momento del clic; `handleAddRule` solo
  se pasa como prop (SPEC-022).
- [x] **4. `PartiesTab.tsx`** — `44cfca5`. Verificado (JSX movido idéntico salvo
  renombres; formularios a medias se conservan al cambiar de pestaña). `CopyBox`
  (no `WritingBox`) con las tres `datalist`; todo el estado en el padre.
- [-] **5. DESCARTADO (2026-10-15) hooks en el padre:**
  `useNotesExtraction` y `useCaseSave`. Riesgo alto, ganancia ~200 líneas.
- [x] **6. Cierre** (2026-10-14): `issue.md` (ISS-006 cerrado) y `DECISIONS.md`
  D-035 (política de refactor y estructura de componentes). `CLAUDE.md` no
  necesita cambios: la estructura de ficheros no es parte de su contenido.

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

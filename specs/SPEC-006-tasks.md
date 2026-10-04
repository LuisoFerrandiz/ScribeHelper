# SPEC-006 — Tareas

Estado: pendientes, nada implementado todavía.

Relacionado: `SPEC-006-facts-found.md` (requisitos),
`SPEC-006-plan.md` (diseño detallado de cada tarea),
`SPEC-005-tasks.md` (si SPEC-005 no está hecha todavía, su tarea 4
debe completarse con ambos `box` activados antes de la tarea 1 de
aquí).

Orden de ejecución — tareas 1 (fuente IA+examples), 2-3 (autocompletado
sail number→rol) y 4-5 (lista de referencia) son independientes entre
sí; todas deben terminar antes de la tarea 6 (verificación conjunta).

- [ ] **1. Activar fuente IA+examples para `facts_found`.** Si
  `SPEC-005` ya está implementada: añadir `facts_found` a la rama de
  `SuggestionsPanel.tsx` que usa `ExamplePhraseSuggestions`. Si no:
  implementar `exampleSuggestions.ts` + `GET
  /ai/example-suggestions/:box` + `ExamplePhraseSuggestions.tsx` tal
  como los describe `SPEC-005-plan.md`, activando ambos `box` de una
  vez.
- [ ] **2. `GhostTextarea.tsx` — prop `sailNumberRoles`.** Chequeo
  determinista (sin red, sin debounce) antes del flujo IA existente;
  sin cambio de comportamiento cuando la prop no se pasa.
- [ ] **3. `CaseForm.tsx` — conectar `sailNumberRoles`.** Solo en el
  `GhostTextarea` de `box="facts_found"`, construido desde
  `initiator.sailNumber`/`respondent.sailNumber` ya en estado.
- [ ] **4. `PartyReference.tsx`.** Componente nuevo: dos líneas fijas
  (initiator/respondent, sail number + boat name), resalta la que
  coincide (substring) con `currentText`.
- [ ] **5. `SuggestionsPanel.tsx` — prop `partyReference`.** Sección
  siempre visible (no colapsable) al principio del panel cuando se
  pasa; `CaseForm.tsx` la pasa solo en el tab Facts Found.
- [ ] **6. Verificar** (ver `SPEC-006-plan.md` → Verificación), luego
  commit + push, avisar para redeploy.

## Fuera de esta tanda de tareas

- Cambiar "AI draft" en Conclusion/Decision.
- Autocompletado/lista de referencia para witnesses.
- Tab "2. Jury".

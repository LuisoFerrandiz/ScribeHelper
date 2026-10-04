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

- [x] **1. Activar fuente IA+examples para `facts_found`.** SPEC-005
  ya estaba implementada — solo se añadió `facts_found` a
  `EXAMPLE_SUGGESTION_BOXES` en `SuggestionsPanel.tsx`. Backend sin
  cambios (ya soportaba el `box` desde su diseño genérico).
- [x] **2. `GhostTextarea.tsx` — prop `sailNumberRoles`.** Chequeo
  determinista (sin red, sin debounce) antes del flujo IA existente,
  mismo `useEffect`; sin cambio de comportamiento cuando la prop no se
  pasa (los otros 3 usos de `GhostTextarea` no la reciben).
- [x] **3. `CaseForm.tsx` — conectar `sailNumberRoles`.** Solo en el
  `GhostTextarea` de `box="facts_found"`, memoizado con `useMemo`
  (evita recalcular el array en cada render y re-disparar el efecto de
  `GhostTextarea` sin motivo — sugerencia del `reviewer`).
- [x] **4. `PartyReference.tsx`.** Componente nuevo: dos líneas fijas
  (initiator/respondent, sail number + boat name vía `formatBoat()`),
  resalta la que coincide (substring) con `currentText`.
- [x] **5. `SuggestionsPanel.tsx` — prop `partyReference`.** Sección
  siempre visible (no colapsable) al principio del panel cuando se
  pasa; `CaseForm.tsx` la pasa solo en el tab Facts Found.
- [x] **6. Verificar.** `npm run typecheck`/`npm run build` limpios;
  probado en vivo: lista de referencia siempre visible con
  initiator/respondent reales; escribir el sail number del initiator
  dispara ghost-text " (initiator)" sin red ni debounce y resalta la
  fila correspondiente; Tab inserta el texto real (confirmado
  disparando el evento directo — el Tab del teclado vía el tool de
  automatización no llegaba al handler por un problema del propio
  tool, no del código, mismo patrón que fallos de click vistos en
  otras verificaciones de esta sesión); "AI suggestions" visible en
  Facts Found, endpoint devuelve vacío sin inventar (sin examples con
  contenido de Facts Found en la DB de desarrollo). Revisión con el
  agente `reviewer`: VEREDICTO APROBADO — casos límite de
  `endsWithSailNumber` (coincidencia parcial, sail number vacío,
  solapamiento entre los dos números) revisados sin encontrar bug
  real; witnesses confirmado sin tocar en ninguna de las dos features
  nuevas. Pendiente: commit + push, avisar para redeploy.

## Fuera de esta tanda de tareas

- Cambiar "AI draft" en Conclusion/Decision.
- Autocompletado/lista de referencia para witnesses.
- Tab "2. Jury".

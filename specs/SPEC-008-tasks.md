# SPEC-008 — Tareas

Estado: pendientes, nada implementado todavía.

Relacionado: `SPEC-008-decision.md` (requisitos), `SPEC-008-plan.md`
(diseño detallado de cada tarea).

Orden de ejecución — tareas 1 (lista de referencia) y 2 (AI
suggestions desde examples) son independientes entre sí; ambas deben
terminar antes de la tarea 3 (verificación conjunta).

- [x] **1. `PartyReference.tsx` — prop `race`.** Tercera fila
  opcional, mismo patrón de resaltado que initiator/respondent.
  `SuggestionsPanel.tsx` (`PartyReferenceData`) y `CaseForm.tsx` (tab
  Decision) la conectan con el `race` del caso ya existente.
- [x] **2. Activar fuente IA+examples para `decision`.** Ampliar
  `ExampleSuggestionBox` (backend y frontend), `BOX_SECTION_HINT`,
  `VALID_BOXES` y `EXAMPLE_SUGGESTION_BOXES` con `'decision'`. Sin
  cambios en la función de extracción ni en el prompt.
- [x] **3. Verificar.** `npm run typecheck`/`npm run build` limpios;
  probado en vivo (caso TEST-01: initiator ITA 32004, respondent
  JPN 31929, race "1"): lista de referencia con las 3 filas, escribir
  "ITA 32004" y "race 1" resalta Initiator y Race, Respondent no se
  resalta (correcto, no aparece en el texto); "AI suggestions" visible
  sin error, "No usable phrases found..." sin crashear. Revisión con
  el agente `reviewer`: VEREDICTO APROBADO — confirmó los 4 RF; único
  hallazgo opcional (comentario desactualizado en
  `exampleSuggestions.ts` mencionando "hasta sus propias specs" para
  conclusion/decision) corregido. Pendiente: commit + push, avisar
  para redeploy.

## Fuera de esta tanda de tareas

- Párrafo candidato del protest form para Decision
  (`decision_candidate`) — no se conecta.
- Parseo de `race` en pruebas individuales.
- Borrar "AI draft"/`AIDraftPanel.tsx`.

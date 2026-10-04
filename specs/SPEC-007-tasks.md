# SPEC-007 — Tareas

Estado: pendientes, nada implementado todavía.

Relacionado: `SPEC-007-conclusion.md` (requisitos), `SPEC-007-plan.md`
(diseño detallado de cada tarea).

Orden de ejecución — tareas 1 (protest form) y 2 (AI suggestions desde
examples) son independientes entre sí; ambas deben terminar antes de
la tarea 3 (verificación conjunta).

- [x] **1. Conectar `conclusion_candidate` al panel de Conclusion.**
  `CaseForm.tsx` — pasar `protestForm={{ paragraph: {...} }}` a
  `SuggestionsPanel` con `box="conclusion"`, condicionado a que el
  campo no esté vacío. Sin cambios de backend/tipos.
- [x] **2. Activar fuente IA+examples para `conclusion`.** Ampliar
  `ExampleSuggestionBox` (backend y frontend), `BOX_SECTION_HINT`,
  `VALID_BOXES` y `EXAMPLE_SUGGESTION_BOXES` con `'conclusion'`. Sin
  cambios en la función de extracción ni en el prompt (ya genéricos
  por `box`).
- [x] **3. Verificar.** `npm run typecheck`/`npm run build` limpios;
  probado en vivo (caso TEST-01, sin protest form adjunto): tab
  Conclusion muestra "AI suggestions" en vez de "AI draft", endpoint
  responde `{"phrases":[]}` y la UI muestra "No usable phrases found
  in the accepted examples." sin error; rama "From protest form" no
  probada con datos reales (ningún caso de la DB de desarrollo tiene
  `conclusion_candidate` no vacío) — aceptado como lo permite el plan.
  Revisión con el agente `reviewer`: VEREDICTO APROBADO — confirmó
  los 4 RF, sin regresión en RF-002/RF-004. Pendiente: commit + push,
  avisar para redeploy.

## Fuera de esta tanda de tareas

- "AI draft" clásico para Decision.
- Subcategorización de phrases por tipo de caso (Validity/Conclusions/
  Reopenings) — confirmado con el dueño que no se añade.
- Cualquier autocompletado determinista nuevo para Conclusion.

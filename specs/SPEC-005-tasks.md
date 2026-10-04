# SPEC-005 — Tareas

Estado: pendientes, nada implementado todavía.

Relacionado: `SPEC-005-procedural-matters.md` (requisitos),
`SPEC-005-plan.md` (diseño detallado de cada tarea).

Orden de ejecución — cada tarea asume terminadas las anteriores. Las
tareas 1-3 (pipeline de frases) y 4-7 (sugerencias IA) son
independientes entre sí, pueden hacerse en cualquier orden relativo,
pero ambas deben terminar antes de la tarea 8 (verificación conjunta).

- [ ] **1. Conversión del `.xlsx` a `.md`.** Nueva función que
  convierte `apps/api/seed/preferred-standard-wording.xlsx` con
  `convertToMarkdown` (ya existente) y lo guarda en
  `data/phrases/base/preferred-standard-wording.md` si no existe
  todavía.
- [ ] **2. Parser del `.md`.** Sustituir `parseSimpleSheet`/
  `parseNoHearingSheet` (`seedPhrases.ts`, hoy leen `XLSX.WorkSheet`)
  por un parser que lee las tablas HTML del `.md` convertido, mismo
  mapeo hoja→caja (`SIMPLE_SHEETS` + "NO Hearing"), mismo resultado
  `Row[]` (`box`, `label`, `body`).
- [ ] **3. `seedBasePhrases()`.** Cambiar la llamada de `XLSX.read`
  directo a conversión+parseo del `.md`. Verificar que el recuento de
  frases seeded no cambia respecto al pipeline anterior.
- [ ] **4. Backend — `exampleSuggestions.ts`.** Nueva función
  `suggestProceduralMattersPhrases()`: lee examples aceptados
  (`kind='example'`, `status='accepted'`, cualquier `scope`), pide a
  la IA una lista de frases generalizadas (sin datos específicos de
  caso), devuelve `{ phrases: string[] }`, vacío si no hay examples o
  no hay contenido de Procedural Matters en ninguno.
- [ ] **5. Ruta — `GET /ai/procedural-matters-suggestions`.**
  Registrada junto a las demás rutas de IA.
- [ ] **6. Frontend — tipos/api.** `ExampleSuggestions` en `types.ts`;
  `suggestProceduralMattersPhrases()` en `api.ts`.
- [ ] **7. Frontend — `ExamplePhraseSuggestions.tsx`.** Componente
  nuevo, carga al montar (mismo patrón que `AIDraftPanel.tsx`), lista
  de frases click-to-insert. `SuggestionsPanel.tsx`: bifurca por `box`
  — `procedural_matters` usa este componente ("AI suggestions"), las
  otras 3 cajas siguen con `AIDraftPanel` ("AI draft"), sin cambios en
  ellas.
- [ ] **8. Verificar** (ver `SPEC-005-plan.md` → Verificación), luego
  commit + push, avisar para redeploy.

## Fuera de esta tanda de tareas

- Cambiar "AI draft" en Facts Found/Conclusion/Decision.
- Botón de descarga del `.xlsx` original en la UI.
- Indexar `examples/` en FTS5.
- Tab "2. Jury" (aplazada a spec futura).

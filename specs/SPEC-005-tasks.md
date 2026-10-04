# SPEC-005 — Tareas

Estado: pendientes, nada implementado todavía.

Relacionado: `SPEC-005-procedural-matters.md` (requisitos),
`SPEC-005-plan.md` (diseño detallado de cada tarea).

Orden de ejecución — cada tarea asume terminadas las anteriores. Las
tareas 1-3 (pipeline de frases) y 4-7 (sugerencias IA) son
independientes entre sí, pueden hacerse en cualquier orden relativo,
pero ambas deben terminar antes de la tarea 8 (verificación conjunta).

- [x] **1. Conversión del `.xlsx` a `.md`.** Nueva función que
  convierte `apps/api/seed/preferred-standard-wording.xlsx` con
  `convertToMarkdown` (ya existente) y lo guarda en
  `data/phrases/base/preferred-standard-wording.md` si no existe
  todavía. (`apps/api/src/phrases/convertSeedToMarkdown.ts`.)
- [x] **2. Parser del `.md`.** Sustituir `parseSimpleSheet`/
  `parseNoHearingSheet` (`seedPhrases.ts`, hoy leen `XLSX.WorkSheet`)
  por un parser que lee las tablas HTML del `.md` convertido, mismo
  mapeo hoja→caja (`SIMPLE_SHEETS` + "NO Hearing"), mismo resultado
  `Row[]` (`box`, `label`, `body`). (`apps/api/src/phrases/parseSeedMarkdown.ts`
  — maneja `rowspan`/`colspan`/`<br/>`/entidades del HTML generado.)
- [x] **3. `seedBasePhrases()`.** Cambiar la llamada de `XLSX.read`
  directo a conversión+parseo del `.md`. Verificado: 333/333 frases,
  0 diferencias contra el pipeline anterior (comparación ad hoc,
  recuento por caja idéntico); migrate completo contra una DB nueva
  también seedea 333 filas.
- [ ] **4. Backend — `exampleSuggestions.ts`.** Nueva función
  `suggestPhrasesFromExamples(box: 'procedural_matters' | 'facts_found')`
  — firma genérica desde ya (`SPEC-006-facts-found.md` reutiliza esta
  misma función para `facts_found`, evita duplicarla): lee examples
  aceptados (`kind='example'`, `status='accepted'`, cualquier
  `scope`), pide a la IA una lista de frases generalizadas (sin datos
  específicos de caso) para la sección correspondiente a `box`,
  devuelve `{ phrases: string[] }`, vacío si no hay examples o no hay
  contenido de esa sección en ninguno. Esta tarea solo activa la rama
  `procedural_matters` en el frontend (tarea 7); la rama
  `facts_found` queda escrita pero sin usar hasta SPEC-006.
- [ ] **5. Ruta — `GET /ai/example-suggestions/:box`.** Registrada
  junto a las demás rutas de IA, `box` restringido a
  `'procedural_matters' | 'facts_found'`.
- [ ] **6. Frontend — tipos/api.** `ExampleSuggestions` en `types.ts`;
  `suggestPhrasesFromExamples(box)` en `api.ts`.
- [ ] **7. Frontend — `ExamplePhraseSuggestions.tsx`.** Componente
  nuevo, recibe `box` como prop, carga al montar (mismo patrón que
  `AIDraftPanel.tsx`), lista de frases click-to-insert.
  `SuggestionsPanel.tsx`: bifurca por `box` — `procedural_matters` usa
  este componente ("AI suggestions"); `facts_found`, `conclusion` y
  `decision` siguen con `AIDraftPanel` ("AI draft") hasta sus propias
  specs, sin cambios en ellas.
- [ ] **8. Verificar** (ver `SPEC-005-plan.md` → Verificación), luego
  commit + push, avisar para redeploy.

## Fuera de esta tanda de tareas

- Cambiar "AI draft" en Facts Found/Conclusion/Decision.
- Botón de descarga del `.xlsx` original en la UI.
- Indexar `examples/` en FTS5.
- Tab "2. Jury" (aplazada a spec futura).

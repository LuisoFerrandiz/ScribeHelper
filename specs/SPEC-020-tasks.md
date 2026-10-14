# SPEC-020 — Tareas

Estado: implementada y desplegada (commit `8a06e43`, redeploy hecho por el dueño, verificada en vivo contra `http://192.168.1.105:8086/`).

Relacionado: `SPEC-020-lista-unica-sugerencias.md` (requisitos),
`SPEC-020-plan.md` (cómo).

- [x] **1. `phrases.ts` — filtro de caja antes del `LIMIT` (RF-012).**
  `npm run build` en `apps/api` limpio.
- [x] **2. `suggestionItems.ts` — tipos y `caseSuggestionItems`.**
  Orden formulario → notas, líneas antes que párrafo, descarta vacíos.
- [x] **3. `useExampleSuggestions.ts` — hook con caché por caja a nivel
  de módulo, guarda de doble clic y de cambio de caja (RF-005).**
- [x] **4. `SuggestionList.tsx` — componente: búsqueda, "Browse
  phrases", "Suggest from examples"/"Refresh", lista uniforme con
  `title`, mensajes de vacío/error, pie de guardar como frase.**
- [x] **5. `styles.css` — estilos nuevos (`line-clamp: 3`) y borrado del
  CSS de secciones plegables y `phrase-picker-panel`.**
- [x] **6. `CaseForm.tsx` — sustituir los cuatro montajes; montar
  `PartyReference` aparte en Facts Found y Decision (RF-013); quitar
  prop `caseId` de los montajes de sugerencias; actualizar comentarios.**
- [x] **7. Borrar `SuggestionsPanel.tsx`, `PhrasePicker.tsx`,
  `ExamplePhraseSuggestions.tsx`.** Grep: sin referencias residuales.
- [x] **8. `DECISIONS.md` — entrada D-030 (append-only).**
- [x] **9. Verificar.** `npm run typecheck` (web) y `npm run build` (api)
  limpios. Probado en vivo (caso TEST-02): lista única sin secciones ni
  "(own)", "Browse phrases" y búsqueda de frases por caja, la lista
  reacciona al terminar "Process" de las hearing notes, inserción de texto
  completo al final con línea en blanco, `PartyReference` en Facts Found y
  Decision. **Sin probar en vivo:** "Suggest from examples" (gasta una
  llamada al modelo), Procedural Matters y Conclusion, "Save current text
  as phrase" y la caché de ejemplos entre pestañas.
- [x] **10. Commit `8a06e43` y push a `master`, "Pull and redeploy" hecho
  por el dueño, verificación en vivo (ver tarea 9).**

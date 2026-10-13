# SPEC-020 — Tareas

Estado: tareas 1-8 implementadas (typecheck web y build api limpios); faltan 9 (prueba en vivo) y 10 (commit/push/redeploy).

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
- [ ] **9. Verificar en local.** `npm run typecheck` (web) y `npm run
  build` (api) limpios. Probar las cuatro cajas según la lista de
  verificación de la spec.
- [ ] **10. Commit y push a `master` (solo cuando el dueño lo ordene),
  "Pull and redeploy" en Portainer, verificación en vivo contra
  `http://192.168.1.105:8086/` y reconfirmación.**

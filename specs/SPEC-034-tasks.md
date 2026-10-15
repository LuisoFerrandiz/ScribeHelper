# SPEC-034 — Tareas

Estado (2026-10-15): **todas hechas, desplegadas y verificadas en vivo** (TEST-02 sin Save). Commits:
`6244a99` (T1-T5), `8bf83b9` (T6-T10), `32acc76` `1fe25d9` `bdfdd31` `6d47813` `e371d7b` `36bd9e2`
`1b4d42f` (ajustes del filtro tras probar en prod), `3b5c2f3` (T13), `1792b7f` (T14-T15),
`17e7de1` (extracción de notas eliminada), `f207c59` (T17).

- [x] T1 `ai/json.ts` con `parseJson` compartido (solo `fillGaps.ts` y el motor nuevo lo usan; `extract.ts` y `exampleSuggestions.ts` mantienen su parser).
- [x] T2 `ai/proposals.ts`: topes de entrada, marcadores propios, prompt, Haiku 4.5, `max_tokens` 1200, `stop_reason`, fallback.
- [x] T3 Validación: huecos verificados, redacción nueva solo en Procedural/Facts y frase por frase (ver D-046).
- [x] T4 `routes/proposals.ts` y registro; `GET /phrases/search` devuelve `[]` si el FTS falla.
- [x] T5 Script local sobre copia de la BD (scratchpad) con casos de JSON truncado, inyección, huecos, redacción nueva, etc.
- [x] T6 `GhostTextarea`: `insertAtCaret` sin reemplazar la selección y con espacio; `getSelectedText`.
- [x] T7 `types.ts`/`api.ts` y `proposalRanking.ts`.
- [x] T8 `useProposals.ts`.
- [x] T9 `ProposalsStrip.tsx` y `ProposalsTray.tsx`; piloto en Facts.
- [x] T10 Build y typecheck.
- [x] T11 Commit y redeploy.
- [x] T12 Verificación del piloto en vivo (ancho del textarea, renovación, selección, atribución).
- [x] T13 Procedural, Conclusion y Decision (líneas del caso como tarjetas deterministas; solo frases en Conclusion/Decision; sin frases de resultado en Decision).
- [x] T14 `MoreMenu.tsx` y `ftsQuery.ts`.
- [x] T15 Columna retirada de las cuatro cajas de frases; `SuggestionList` y `suggestionItems` eliminados.
- [x] T16 Build, typecheck y verificación en vivo de las cuatro cajas.
- [x] T17 Rules Applicable: bandeja encima del editor, `RulesWarnings` bajo la cabecera, `useRuleRefCheck` en `CaseForm`.
- [x] T18 Verificación en local (alta, corpus, Remove, Insert missing, aviso de no halladas) y en vivo.
- [x] T19 Docs: D-046, notas en SPEC-017/020/023/024/031/032, `issue.md`, `CLAUDE.md`, memoria de traspaso.

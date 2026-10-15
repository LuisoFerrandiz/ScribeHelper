# SPEC-032 — Tareas

- [ ] T1 `extract.ts`: tipo `AttachmentExtraction.party_position`, `PartyPosition`; quitar `conclusion_candidate`/`decision_candidate` (solo de este tipo).
- [ ] T2 `extract.ts`: prompt (esquema JSON + sistema) atribuido; quitar el texto "almost always empty".
- [ ] T3 `extract.ts`: `normalizePartyPosition` (cadena, trim, atribución por regex, tope 600, partes vacías fuera) usada en `parseExtraction`; exportada.
- [ ] T4 `complete.ts`: `ChainContext`/`CONTEXT_BOXES`/`CONTEXT_LABEL` con `party_position` (última del bloque; solo Conclusion y Decision); `MARKERS` incluye `Party position`.
- [ ] T5 `complete.ts`: `CONTEXT_SYSTEM` (alegación de parte) y `CONTEXT_SYSTEM_OTHERS` reescrito (regla solo si está en cajas permitidas o texto, nunca solo en la postura).
- [ ] T6 `complete.ts`: `extractRuleRefs` + `citesDisallowedRule(suggestion, allowedTexts)`; aplicar en Conclusion/Decision antes de devolver; la postura no es fuente permitida.
- [ ] T7 `types.ts` (web): `AttachmentExtraction.party_position?`, `ChainContext.party_position?`.
- [ ] T8 `partyPosition.ts`: `partyPositionItems` y `partyPositionContext`.
- [ ] T9 `suggestionItems.ts` + `SuggestionList.tsx` + CSS: `tag`, etiqueta `Party claim — not final`, inserta solo el texto.
- [ ] T10 `CaseForm.tsx`: Conclusion y Decision usan los ítems de postura y `chain.party_position`; quitar `extraction?.conclusion_candidate`/`decision_candidate`.
- [ ] T11 Scripts desechables: `normalizePartyPosition`, `chainContextFor`, filtro de reglas, `partyPositionItems/Context`.
- [ ] T12 `npm run build` (api), `npm run typecheck` (web); grep de los nombres viejos (solo deben quedar los de `NotesExtraction`).
- [ ] T13 Verificación local de UI (etiqueta, inserción sin etiqueta) con datos de prueba en `devdata`.
- [ ] T14 Preguntar commit; tras redeploy, verificación en vivo (criterios 1-9) y limpiar TEST-02.
- [ ] T15 Docs: D-044, ISS-007 cerrado, anotaciones SPEC-003/SPEC-020, memoria de traspaso. `CLAUDE.md`/`constitution.md` solo si el dueño lo pide.

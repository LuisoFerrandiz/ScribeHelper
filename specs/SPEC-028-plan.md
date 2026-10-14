# SPEC-028 — Plan

Relacionado: `SPEC-028-validar-referencias-tecleadas.md`.

1. `apps/api/src/rules/factsQuery.ts`: exportar `unresolvedRefs(text, eventId)`
   (usa `explicitRefs`, `parseCitation`, `sectionsForCitation`; únicas, en
   orden). Mantener la extracción en un solo sitio.
2. `apps/api/src/routes/rules.ts`: `POST /rules/check`.
3. Web `api.ts`: `checkRuleRefs(caseId, text)` → `{ unresolved: string[] }`.
4. `RulesSuggestions.tsx`: prop `rulesText` (texto de la caja); efecto con
   debounce 500 ms y `cancelled`; aviso `rules-warning`. `CaseForm` pasa
   `rulesApplicable`.
5. Script desechable `check_f6b.ts` (scratchpad): resueltas/no resueltas,
   sufijo, alias `Rule`, NoR/SI con y sin evento, texto vacío, 20 000
   caracteres.
6. D-039 en DECISIONS.md.

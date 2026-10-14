# SPEC-027 — Plan

Relacionado: `SPEC-027-reglas-desde-hechos.md`.

1. `apps/api/src/rules/factsQuery.ts` (nuevo): `suggestTerms(text)` (RF-002),
   `explicitRefs(text)` (RF-003: regex de "rule N", "RRS N", "NoR N", "SI N"
   sobre `parseCitation`), y `suggestSections(text, eventId)` que devuelve
   `SectionRow[]` ordenadas (explícitas primero, luego FTS) con la
   deduplicación de apéndices (RF-004) y tope 8.
2. `apps/api/src/routes/rules.ts`: exportar `toHit` y `citedSet(caseId)`
   (extraer del handler de `/rules/search`); nueva `POST /rules/suggest`.
3. Web `api.ts` y `types.ts`: `suggestRules(caseId, text)` con el tipo
   `RuleSearchResult` existente.
4. Web: extraer de `RulePicker.tsx` el listado de resultados a
   `RuleHitList.tsx` (hits, Add, "Already cited", razón de no clasificado) y
   reutilizarlo en `RulePicker` y en la sugerencia.
5. `RulesSuggestions.tsx`: botón, estados y lista; prop nueva `factsText`.
   `CaseForm.tsx` pasa `factsFound`.
6. Script desechable `check_f5.ts` (en el scratchpad): los cuatro textos de
   ejemplo y casos límite (texto vacío, 8000+ caracteres, comillas,
   `NEAR(`, número explícito, dedupe de apéndice, caso de otro evento).
7. Verificación local de la ruta con la API sobre copia de datos; en vivo
   tras el redeploy.
8. D-038 en DECISIONS.md si hay decisión nueva (FTS determinista antes que IA
   para sugerir reglas; solo Facts Found como fuente).

# SPEC-003 — Plan

Estado: nada que implementar — spec puramente descriptiva de código ya
desplegado.

Relacionado: `SPEC-003-documentacion-previa.md` (requisitos/comportamiento
documentado), `SPEC-003-tasks.md` (desglose en tareas).

## Por qué no hay diseño de implementación

A diferencia de SPEC-001/SPEC-002, aquí no hay nada que construir. Toda
la funcionalidad descrita ya existe y está desplegada:

- Tabla `case_attachment` (`apps/api/db/schema.sql`).
- Endpoints en `apps/api/src/routes/caseAttachments.ts`.
- Extracción en `apps/api/src/ai/extract.ts`.
- UI en `apps/web/src/components/CaseForm.tsx` (tab "0. Protest
  Form(s)").

El trabajo de esta spec fue escribir `SPEC-003-documentacion-previa.md`
a partir del código existente, no al revés — cierra el hueco que
`CLAUDE.md` (nota de estado 2026-10-04) ya señalaba: esta
funcionalidad no tenía documentación SDD propia.

## Verificación de la documentación

Comprobado leyendo código, no hay comportamiento nuevo que probar en
vivo:

- Esquema de `case_attachment` vs `apps/api/db/schema.sql`.
- Los 4 endpoints (`GET`/`POST` lista, `GET` archivo, `DELETE`) vs
  `apps/api/src/routes/caseAttachments.ts`.
- Forma de `AttachmentExtraction` y reglas de grounding del prompt vs
  `apps/api/src/ai/extract.ts`.
- Conexión sugerencia→UI vs `apps/web/src/components/CaseForm.tsx`:
  `useSuggestedParty` (370-379), `addSuggestedWitness` (381-383),
  `facts_found_candidates` (803).

## GAP heredados, no resueltos aquí

`SPEC-003-documentacion-previa.md` marca dos `[GAP]`:

- `conclusion_candidate`/`decision_candidate` sin UI conectada.
- `rule_citations_candidate` sin UI conectada y sin grounding contra
  `DECISIONS.md` D-004 (nada se cita si no está en el corpus
  validado).

Su resolución queda para specs futuras, una por tab (Conclusion,
Decision, y la revisión de Rules Applicable), por indicación explícita
del usuario: "cuando lleguemos a cada una conclusion, decision y fact
conectamos todo por ahora vamos spec una por una". No se resuelven
aquí.

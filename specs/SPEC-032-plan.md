# SPEC-032 — Plan

Spec: `SPEC-032-postura-de-parte.md` (v2). Sin migración, sin esquema nuevo.

## Piezas y archivos

| Pieza | Archivo | Cambio |
|---|---|---|
| Forma de datos | `apps/api/src/ai/extract.ts`, `apps/web/src/types.ts` | `party_position` sustituye `conclusion_candidate`/`decision_candidate` de `AttachmentExtraction` (no tocar `NotesExtraction`) |
| Prompt y validación | `apps/api/src/ai/extract.ts` | prompt atribuido; `normalizePartyPosition` pura y exportada (atribución, tope 600, partes vacías) |
| Contexto del fantasma | `apps/api/src/ai/complete.ts` | `ChainContext`, `CONTEXT_BOXES`, `CONTEXT_LABEL`, `MARKERS`, `CONTEXT_SYSTEM`, `CONTEXT_SYSTEM_OTHERS` |
| Filtro de reglas | `apps/api/src/ai/complete.ts` (o `ai/ruleRefs.ts` si crece) | `extractRuleRefs`, `citesDisallowedRule` puras y exportadas; se aplican a Conclusion/Decision |
| Helper cliente | `apps/web/src/partyPosition.ts` (nuevo) | `partyPositionItems(extraction, box)` y `partyPositionContext(extraction)` |
| Etiqueta | `apps/web/src/suggestionItems.ts`, `SuggestionList.tsx` + CSS | `SuggestionSource` += `'party_position'`, `SuggestionItem.tag?`; botón con etiqueta; inserta solo el texto |
| Cableado | `apps/web/src/components/CaseForm.tsx` (Conclusion ~l.750, Decision ~l.851) | ítems de postura + `chain.party_position`; quitar los `paragraph` antiguos |
| Cliente API | `apps/web/src/types.ts` `ChainContext` | `party_position?: string` |

## Orden

1. Servidor: tipo, prompt y `normalizePartyPosition` en `extract.ts`.
2. Servidor: contexto y filtro de reglas en `complete.ts`.
3. Cliente: tipos, helper, etiqueta, cableado.
4. Scripts desechables de prueba pura (scratchpad).
5. Verificación local (build/typecheck + pruebas puras).
6. Preguntar commit. Tras redeploy: verificación en vivo en TEST-02.
7. Documentación (D-044, ISS-007, anotaciones SPEC-003/020).

## Riesgos de la construcción

- Renombrado: solo `AttachmentExtraction`; `NotesExtraction` y `extractNotes.ts`
  se quedan (grep antes y después).
- El filtro de reglas aplica a Conclusion/Decision aunque no haya postura
  (RF-011); probar que no descarta sugerencias normales sin cita.
- IA solo se prueba en vivo; lo determinista, con scripts.

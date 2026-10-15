# SPEC-034 — Plan

Spec: `SPEC-034-bandeja-sugerencias.md` (v4). **Sin cambios de esquema ni de datos.** Un
endpoint nuevo, una corrección mínima de `GET /phrases/search`, y cambios de UI. Sin redeploy
de BD, pero el endpoint usa la API de IA: solo comprobable en vivo (la clave vive en el
servidor). Verificar siempre en TEST-02 sin Save.

## Piezas y archivos

| Pieza | Archivo | Cambio |
|---|---|---|
| Helper JSON | `apps/api/src/ai/json.ts` (nuevo) | `parseJson` compartido (primer `{` a último `}`, sin fences); `fillGaps.ts` y `extractNotes.ts` lo importan |
| Motor | `apps/api/src/ai/proposals.ts` (nuevo) | entrada con topes, prompt con marcadores propios, llamada Haiku 4.5, `stop_reason`, validación (RF-009/010/012), fallback |
| Reutilización | `ai/fillGaps.ts`, `ai/complete.ts` | exportar `buildSources`, `validateFills`, `isDataGapText`, `chainContextFor`, `CHATTER`, `citesDisallowedRule` (hoy parte privados) |
| Ruta | `apps/api/src/routes/proposals.ts` (nuevo), `routes/index.ts` | `POST /cases/:id/proposals`; 404 caso, 400 caja, sin clave → `ai:'unavailable'` |
| FTS | `apps/api/src/routes/phrases.ts` | `GET /phrases/search`: capturar error de FTS → `[]` |
| Tipos/API web | `apps/web/src/types.ts`, `api.ts` | `Proposal`, `postProposals(...)`; sincronizados a mano |
| Ranking local | `apps/web/src/proposalRanking.ts` (nuevo) | palabras de contenido, solapamiento, desempate propias/`id` (RF-004) |
| Hook | `apps/web/src/useProposals.ts` (nuevo) | capa instantánea + IA, debounce 1500 ms, "sucio", `requestId`, congelar bajo puntero |
| Franja | `apps/web/src/components/ProposalsStrip.tsx` (nuevo) | tarjetas, altura reservada, Refresh, nota "AI proposals unavailable" |
| Menú | `apps/web/src/components/MoreMenu.tsx` (nuevo) | menú propio, Escape global, foco, buscador/Browse/ejemplos/Save as phrase |
| Editor | `apps/web/src/components/GhostTextarea.tsx` | `insertAtCaret` sin reemplazo; lectura de selección en el handle |
| Layout | `apps/web/src/components/WritingBox.tsx`, `CaseForm.tsx` | slot `tray`; retirar columna |
| Lista | `apps/web/src/components/SuggestionList.tsx` | se desmonta de la columna; su lógica se reutiliza en `MoreMenu` |
| Rules | `apps/web/src/components/RulesSuggestions.tsx`, `CaseForm.tsx` | hook de referencias en `CaseForm`; bandeja simple |
| Datos del caso | `apps/web/src/partyPosition.ts`, `suggestionItems.ts` | dejan de generar tarjetas; entran como fuente del motor (`notes_extraction`, formulario) |
| Estilos | `apps/web/src/styles.css` | franja, tarjetas, menú; retirar columna y `line-clamp` |
| Docs | `DECISIONS.md` D-046, notas en SPEC-017/020/023/024/031/032, `issue.md`, `CLAUDE.md` | al final |

## Orden

1. `json.ts`, exports de `fillGaps.ts`/`complete.ts`, `proposals.ts`, ruta y corrección FTS.
2. Script local sobre copia de la BD (scratchpad `devdata`): todos los casos de RF-009/010/012.
3. `insertAtCaret` sin reemplazo y lectura de selección.
4. `proposalRanking.ts`, `useProposals.ts`, `ProposalsStrip.tsx`; piloto en Facts con la columna aún.
5. Build/typecheck; pedir commit de los pasos 1-4.
6. Resto de cajas de frases, `MoreMenu`, Save as phrase; retirar columna y estilos.
7. Rules: hook en `CaseForm` y bandeja simple.
8. Build/typecheck; el dueño redeploya (`Commit: <hash>`), verificación en vivo, limpieza.
9. Docs y memoria de traspaso.

## Riesgos de la construcción

- **IA inventando hechos (Facts):** filtro RF-010 solo detecta dígitos, reglas y vocabulario de
  resultado; el resto depende del prompt. Revisar salidas reales en TEST-02 antes de generalizar.
- **Sesión de huecos y foco:** inputs del menú con `data-gap-ui` sin `preventDefault`; Escape global
  no debe romper el fantasma.
- **Duplicados de tipos web/API:** sin tsc compartido; revisar a mano.
- **Coste:** una llamada por pausa y caja; medir tokens y tasa de descarte en TEST-02.
- **Mover `SuggestionList`:** conservar su lógica (ejemplos, Browse, guardado) para que el menú no
  regrese comportamiento; Rules Applicable queda con su estructura de lista.

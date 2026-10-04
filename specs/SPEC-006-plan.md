# SPEC-006 — Plan de implementación

Estado: aprobado, sin implementar todavía.

Relacionado: `SPEC-006-facts-found.md` (requisitos),
`SPEC-006-tasks.md` (desglose en tareas ejecutables),
`SPEC-005-plan.md` (pipeline de frases y `suggestPhrasesFromExamples`,
reutilizados aquí sin rediseño).

## Contexto

RF-001/RF-002/RF-003 no requieren trabajo propio: layout ya construido,
fuente 1 sin cambios, fuente 2 hereda el pipeline de SPEC-005 (puede
implementarse antes o después, no hay dependencia dura — mientras
SPEC-005 no esté hecha, `facts_found` sigue leyendo frases del `.xlsx`
como hoy, sin romper nada).

Quedan tres piezas reales:

- RF-004: activar `ExamplePhraseSuggestions`/`suggestPhrasesFromExamples`
  (diseñadas en `SPEC-005-plan.md` con firma ya genérica) para
  `box = 'facts_found'`.
- RF-005: autocompletado determinista sail number → rol.
- RF-006: lista de referencia de partes, en vivo.

## Diseño — RF-004: activar fuente IA+examples para `facts_found`

Si `SPEC-005` ya está implementada: solo hace falta añadir
`facts_found` a la rama de `SuggestionsPanel.tsx` que usa
`ExamplePhraseSuggestions` en vez de `AIDraftPanel` — la función
backend y la ruta (`GET /ai/example-suggestions/:box`) ya soportan
`'facts_found'` desde su diseño en `SPEC-005-plan.md`, no hace falta
tocarlas.

Si `SPEC-005` **no** está implementada todavía cuando se construya
esta spec: implementar `exampleSuggestions.ts`,
`GET /ai/example-suggestions/:box` y `ExamplePhraseSuggestions.tsx`
tal como los describe `SPEC-005-plan.md` (no se duplica el diseño
aquí), activando directamente ambos `box` (`procedural_matters` y
`facts_found`) de una vez.

## Diseño — RF-005: autocompletado sail number → rol

### Dónde viven los datos

`CaseForm.tsx` ya tiene `initiator`/`respondent`
(`PartyEdit { sailNumber, boatName, representedBy }`) como estado del
componente, cargados por el tab General & Parties — visibles en todo
el componente, incluida la sección que renderiza el tab Facts Found.
No hace falta ninguna llamada nueva al backend.

### `GhostTextarea.tsx` — nueva prop, chequeo determinista antes del IA

Nueva prop opcional `sailNumberRoles?: { sailNumber: string; role: 'initiator' | 'respondent' }[]`.
Dentro del mismo `useEffect` que hoy dispara `completeInline`:

1. Si `sailNumberRoles` tiene entradas, comprobar primero —
   sincrónico, sin debounce, sin llamada a red — si `value` (hasta la
   posición del cursor) termina exactamente en uno de los
   `sailNumber` dados, seguido de un límite de palabra (fin de cadena,
   o el carácter siguiente no es alfanumérico). Si hay coincidencia:
   `setSuggestion(' (' + role + ')')` de inmediato, **sin** llamar a
   `api.completeInline` esta vez — es determinista, más rápido y más
   barato, coherente con `constitution.md` ("preferir lo determinista
   sobre la IA cuando ambos puedan resolver el mismo problema").
2. Si no hay coincidencia determinista, sigue el flujo actual sin
   cambios (debounce + `completeInline`).
3. Aceptar (Tab) y descartar (Escape/seguir escribiendo) usan el mismo
   mecanismo ya existente — ninguna rama nueva en `handleKeyDown`.

`CaseForm.tsx`, al montar `GhostTextarea` para `box="facts_found"`,
pasa:
```ts
sailNumberRoles={[
  ...(initiator.sailNumber ? [{ sailNumber: initiator.sailNumber, role: 'initiator' as const }] : []),
  ...(respondent.sailNumber ? [{ sailNumber: respondent.sailNumber, role: 'respondent' as const }] : []),
]}
```
Los otros 3 usos de `GhostTextarea` (`procedural_matters`,
`conclusion`, `decision`) no pasan esta prop — sin cambio de
comportamiento ahí.

## Diseño — RF-006: lista de referencia de partes, en vivo

Nuevo componente `apps/web/src/components/PartyReference.tsx`:

```ts
interface Props {
  initiator: { sailNumber: string; boatName: string };
  respondent: { sailNumber: string; boatName: string };
  currentText: string; // para resaltar coincidencia
}
```

- Pinta dos líneas fijas: `Initiator: <sail> <boat>` /
  `Respondent: <sail> <boat>` — vacío se muestra como `—`, no se
  oculta la fila (RF-006 pide "siempre visible").
- Resalta (clase `highlight`, o similar) la línea cuyo `sailNumber` no
  esté vacío y aparezca como substring de `currentText` (coincidencia
  parcial basta, según lo pedido — "cambia según vaya escribiendo").
- Solo lectura — ningún botón, ningún insert (RF-007).

`SuggestionsPanel.tsx`: nueva prop opcional `partyReference?: {
initiator: ...; respondent: ... }`. Cuando está presente, una sección
NO colapsable (siempre visible, a diferencia de las otras 3 — pedido
explícito "siempre visible") al principio del panel, antes de
"Protest form". `CaseForm.tsx` la pasa solo en el tab Facts Found, con
los mismos `initiator`/`respondent` ya usados para RF-005.

## Verificación

1. `npm run typecheck` en `apps/web`; `npm run build` en `apps/api`.
2. Manual, en vivo contra `http://192.168.1.105:8086/` tras redeploy:
   - Tab Facts Found: con initiator/respondent ya guardados, la lista
     de referencia muestra sus sail number/boat name; al escribir ese
     sail number en la caja, la fila correspondiente se resalta.
   - Escribir el sail number del initiator → ghost-text
     `" (initiator)"` aparece sin esperar el debounce de IA; Tab lo
     acepta igual que cualquier otro ghost-text.
   - Escribir un sail number que no coincide con ninguna parte → sigue
     el comportamiento IA actual (debounce, `completeInline`), sin
     regresión.
   - Sección "AI suggestions" (fuente 3) en Facts Found: con al menos
     un example aceptado con contenido de Facts Found, devuelve frases
     generalizadas, click-to-insert; vacía sin examples, sin romper el
     resto del tab.
   - Procedural Matters, Conclusion, Decision: sin regresión — su
     ghost-text y su panel de sugerencias siguen igual que antes de
     esta spec.

## Explícitamente fuera de esta spec

- Las mismas exclusiones ya listadas en `SPEC-006-facts-found.md` →
  "Explícitamente fuera de esta spec".

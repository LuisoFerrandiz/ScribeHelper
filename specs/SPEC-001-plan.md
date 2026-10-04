# SPEC-001 — Plan de implementación

Estado: aprobado, sin implementar todavía.

Relacionado: `SPEC-001-pantalla-de-entrada.md` (requisitos),
`SPEC-001-tasks.md` (desglose en tareas ejecutables),
`SPEC-002-nuevo-caso.md` (diseño del popup "New case" — RF-004 de esta
spec ya no describe un formulario inline, apunta ahí).

**Corrección (tras definir SPEC-002):** el formulario inline de crear
caso descrito originalmente en este plan (inputs `eventName`/
`caseNumber` movidos desde `CaseSelector.tsx`) queda descartado.
`CaseList.tsx` solo necesita un botón "New case" que abre el popup de
`SPEC-002-nuevo-caso.md` — nada de inputs ni lógica find-or-create
dentro de `CaseList.tsx` mismo.

## Contexto

`SPEC-001-pantalla-de-entrada.md` describe sustituir `CaseSelector.tsx`
(selector de texto+datalist, D-018) por un listado tabular de casos —
la nueva pantalla de entrada — más el menú admin-only ("Upload
examples"/"Upload rules"/"Users", hoy visibles para cualquier usuario
logeado en `App.tsx`) y un botón de usuario con submenú de un solo
item (Log out), sustituyendo el texto+botón plano actual.

Las 4 preguntas `[POR DEFINIR]` de la spec se resolvieron en chat con
el usuario (pendiente de volcar a la spec como primera tarea):

- Initiator/Respondent: número de vela + nombre de barco (mismo
  formato que ya produce `formatParties()` en `apps/web/src/format.ts`).
- Filas agrupadas por regata, igual que el árbol visual que ya tiene
  `CaseSelector.tsx` (regata como cabecera, casos debajo).
- Nuevo endpoint backend `GET /cases/summary` — el join se hace en
  servidor en una sola llamada, en vez de que el frontend llame
  `GET /cases/:id/full` una vez por caso.
- Sin buscador/filtro ni paginación — fuera de alcance por ahora.

## Diseño

### Backend — nuevo endpoint de resumen

Archivo nuevo `apps/api/src/routes/caseSummary.ts`, registrado en
`apps/api/src/routes/index.ts` junto a `registerCaseDetailRoute`.

```sql
SELECT
  protest_case.id, protest_case.case_number, protest_case.decision,
  event.id AS event_id, event.name AS event_name
FROM protest_case JOIN event ON event.id = protest_case.event_id
ORDER BY event.name, protest_case.case_number
```

Más una segunda consulta que trae las parties de todos los casos de
una vez (`SELECT party.case_id, party.role, boat.sail_number,
boat.boat_name FROM party LEFT JOIN boat ON boat.id = party.boat_id
WHERE party.case_id IN (...)`), agrupadas por `case_id` en JS y
adjuntadas a cada fila como `initiator`/`respondent`. Mismo join que ya
usa `caseDetail.ts` para `parties` en `/full`, pero en lote para todos
los casos en vez de uno. Forma de la respuesta:

```ts
interface CaseSummaryRow {
  id: number;
  case_number: string;
  event_id: number;
  event_name: string;
  decided: boolean; // decision.trim() !== ''
  initiator: { sail_number: string | null; boat_name: string | null } | null;
  respondent: { sail_number: string | null; boat_name: string | null } | null;
}
```

### Frontend — `CaseList.tsx` nuevo, sustituye a `CaseSelector.tsx`

Componente nuevo `apps/web/src/components/CaseList.tsx`:

- Llama a `api.listCaseSummaries()` (método nuevo en `api.ts` →
  `GET /cases/summary`) al montar.
- Agrupa por `event_name` (reutiliza la forma
  `<ul><li><strong>{nombre}</strong><ul>...</ul></li></ul>` que ya
  tiene `CaseSelector.tsx`), pero cada caso ahora es una fila de 4
  celdas (Case, Initiator, Respondent, Decision) en vez de un botón
  único — sigue siendo un solo elemento clicable por fila, el
  `onClick` llama al mismo prop `onSelect(eventId, caseId)` que
  `CaseSelector` ya recibe, así que el uso en `App.tsx` casi no
  cambia.
- Celda Decision: `row.decided ? 'Decided' : 'Pending'`.
- Celda Initiator/Respondent: reutiliza la expresión exacta de
  `formatParties()` (`apps/web/src/format.ts:12-23`) — extraer la
  línea `[sail_number, boat_name].filter(Boolean).join(' ') || '—'`
  a un helper compartido (`formatBoat()`) exportado desde `format.ts`,
  usado tanto por `formatParties()` como por `CaseList.tsx`, en vez de
  duplicar la expresión.
- Botón "New case" (sin inputs propios en `CaseList.tsx`) que abre el
  popup `NewCaseDialog.tsx` definido en `SPEC-002-nuevo-caso.md` — el
  formulario inline `eventName`/`caseNumber`/`handleGo` de
  `CaseSelector.tsx` NO se traslada aquí, queda descartado junto con
  el resto de `CaseSelector.tsx`.

`CaseSelector.tsx` se borra una vez `CaseList.tsx` sustituye su único
punto de uso en `App.tsx`.

### Frontend — cambios en la cabecera de `App.tsx`

- RF-005 (menú admin-only): envolver los botones "Upload examples" y
  "Upload rules" en el mismo guard `{user.role === 'admin' && (...)}`
  que `App.tsx:82-91` ya usa para "Users" — tres botones, una
  condición, sin lógica nueva.
- RF-006 (botón de usuario + submenú): sustituir el par actual
  `<span className="muted">{user.username}</span><button
  onClick={handleLogout}>Log out</button>` (`App.tsx:93-98`) por un
  dropdown inline — `useState` para `open`, un `<button>` que muestra
  `user.username`, y `{open && <div className="user-menu">...}` con un
  único `<button onClick={handleLogout}>Log out</button>`. Mismo patrón
  de colapsar-al-click que `CollapsibleSection` en
  `SuggestionsPanel.tsx`, sin inventar uno nuevo.

### Estilos — `apps/web/src/styles.css`

- Bloque nuevo `.user-menu` (dropdown `position: absolute` bajo el
  botón de usuario) — pequeño, autocontenido; no hay patrón de
  dropdown existente que reutilizar (comprobado: ninguno en el
  proyecto hoy).
- Las filas de `CaseList.tsx` reutilizan las clases `.list`/
  `.case-browser` que `CaseSelector.tsx` ya usa, extendidas con una
  fila flex/grid simple para las 4 columnas — sin sistema de layout
  nuevo.

### Contabilidad de la spec

Antes de escribir código: actualizar
`specs/SPEC-001-pantalla-de-entrada.md` — sustituir las 4 preguntas de
su sección `[POR DEFINIR]` por las decisiones de arriba (moverlas a
"Decisiones técnicas"), dejando `[POR DEFINIR]` solo si queda algo sin
resolver. Es la primera tarea de `SPEC-001-tasks.md`.

## Verificación

1. `npm run typecheck` en `apps/web`; `npm run build` en `apps/api`.
2. Manual, en vivo contra `http://192.168.1.105:8086/` tras redeploy:
   - La pantalla de entrada muestra casos agrupados por regata, 4
     columnas cada uno, Decision muestra Decided/Pending
     correctamente con y sin texto de decisión.
   - Click en una fila abre el formulario de ese caso.
   - El botón "New case" abre el popup de `SPEC-002-nuevo-caso.md` y
     crea correctamente (verificación detallada de ese flujo vive en
     el plan de SPEC-002, no se repite aquí).
   - Logeado como admin (`luiso`) → Upload examples/rules/Users
     visibles. Logeado como usuario no-admin → ninguno de los tres
     visible.
   - El botón de usuario abre un dropdown con solo "Log out"; al
     clicarlo cierra sesión y vuelve a la pantalla de login.

## Explícitamente fuera de esta spec

- Cambiar contraseña desde el submenú de usuario (ya aplazado en la
  propia spec).
- Buscador/filtro/paginación en el listado de casos.
- Cualquier cambio a `CaseForm.tsx` o a cómo se edita un caso
  individual — solo cambia cómo se *llega* a un caso.

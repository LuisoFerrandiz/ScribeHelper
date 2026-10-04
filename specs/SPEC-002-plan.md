# SPEC-002 — Plan de implementación

Estado: aprobado, sin implementar todavía.

Relacionado: `SPEC-002-nuevo-caso.md` (requisitos), `SPEC-002-tasks.md`
(desglose en tareas ejecutables), `SPEC-001-pantalla-de-entrada.md` +
`SPEC-001-plan.md`/`SPEC-001-tasks.md` (el botón "New case" que abre
este popup vive en `CaseList.tsx`, de esa spec).

## Contexto

`SPEC-002-nuevo-caso.md` describe un popup "New case" — regatta (texto
si no hay ninguna todavía, si no un `<select>` con las existentes +
"New regatta…") y número de caso, nada más — que sustituye el
formulario inline que tenía `CaseSelector.tsx` y que RF-004 de
SPEC-001 describía originalmente (ya corregido en los archivos de
SPEC-001 para apuntar aquí).

Dos decisiones técnicas tomadas directamente (sin preguntar, por
indicación del usuario), documentadas aquí en vez de dejarlas como
`[POR DEFINIR]`:

- **Unicidad (RF-005)**: índice `UNIQUE` real en el esquema, no solo
  comprobación en frontend. `protest_case` no tiene hoy restricción de
  unicidad en `(event_id, case_number)` (`apps/api/db/schema.sql:58-61`)
  — dos pestañas podrían saltarse una comprobación solo-frontend.
- **Mecanismo del popup**: `<dialog>` nativo (`showModal()`/`close()`)
  — da gratis Escape-para-cerrar, click-en-backdrop-para-cerrar y
  atrapar el foco, sin overlay ni lógica de foco hechos a mano. Nada en
  el proyecto usa `<dialog>` todavía, pero tampoco hay ningún overlay
  propio que reutilizar (comprobado: no existe ningún patrón de modal
  hoy).

## Diseño

### Backend — la unicidad se hace real

`apps/api/db/schema.sql`: añadir, justo después de la definición de la
tabla `protest_case` —

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_case_number_per_event
  ON protest_case(event_id, case_number);
```

Idempotente (`IF NOT EXISTS`), aplicado por el `npm run migrate` ya
existente (`apps/api/src/db/migrate.ts:10`, ejecuta `db.exec(schema)`
en cada arranque del contenedor) — no hace falta ningún mecanismo de
migración nuevo. Si ya existieran filas duplicadas en un `data/db` en
producción, este `CREATE UNIQUE INDEX` fallaría ruidosamente al
migrar — aceptable aquí (proyecto de un usuario, sin duplicados
conocidos hoy), pero hay que avisar al desplegar esto.

`apps/api/src/routes/crud.ts`, el handler genérico `POST /${prefix}`
(`crud.ts:27-38`): envolver el `stmt.run(...)` en try/catch — un error
cuyo `message` contenga `UNIQUE constraint failed` (el string de error
de `node:sqlite` para un índice violado) devuelve `409 { error:
'duplicate' }` en vez de un 500 sin manejar. Es un cambio al handler
genérico compartido, así que protege cualquier entidad que use
`registerCrud`, no solo casos — coherente con su propio comentario
"one generic handler instead of eight near-identical route files"
(`crud.ts:10-12`).

### Frontend — `NewCaseDialog.tsx`

Componente nuevo, `apps/web/src/components/NewCaseDialog.tsx`:

```ts
interface Props {
  events: EventRow[];       // ya cargados por CaseList (SPEC-001)
  existingCases: CaseRow[]; // idem — para la comprobación previa de duplicado
  onCreated: (eventId: number, caseId: number) => void;
  onClose: () => void;
}
```

- Envuelve un `<dialog ref={dialogRef}>`, llama a `.showModal()` en un
  `useEffect` al montar; `.close()` dispara `onClose` (evento nativo
  `close` del `dialog`, sin cablear a mano click-en-backdrop/Escape).
- Campo regatta: si `events.length === 0`, un `<input>` de texto plano
  (RF-002). Si no, un `<select>` con cada `event` como opción, más una
  opción final `<option value="__new__">New regatta…</option>`
  (RF-003); elegirla sustituye el select por un `<input>` de texto
  para el nombre nuevo (RF-004) — mismo patrón de sustituir-al-elegir
  que ya usa `CaseForm.tsx` en sus inputs de rol de testigo, nada
  inventado de cero.
- Campo número de caso: siempre `<input>` de texto.
- Al enviar: comprobación previa de duplicado en frontend contra
  `existingCases` (del evento resuelto, ya sea del `<select>` o a
  punto de crearse) para feedback instantáneo (RF-005) — luego llama
  `api.createEvent` (solo si la regata es nueva) y después
  `api.createCase`, capturando un `409` del backend como el error de
  duplicado autoritativo (cubre la carrera que la comprobación
  solo-frontend no puede). Al terminar bien: `onCreated(eventId,
  caseId)`, misma forma que el `onSelect` que `CaseSelector` ya tenía
  (el `CaseList` de SPEC-001 reutiliza ese nombre/forma de prop sin
  cambios).
- Botón Cancel + el cierre nativo del dialog (Escape/backdrop) pasan
  los dos por `onClose` — RF-007 lo cubre el navegador, no código
  propio.

**Follow-up (al implementar, 2026-10-04):** la conexión final no pasa
`onNewCase` por `App.tsx` como se describía originalmente abajo —
`CaseList.tsx` encapsula el diálogo entero (`dialogOpen` es su propio
estado, monta `NewCaseDialog` directamente). Mejor encapsulación,
coherente con D-028 (UX/lógica separadas, el componente que posee la
UI posee su estado); ningún RF exige la forma concreta de paso de
props. `SPEC-001-tasks.md` tarea 6 quedó con una referencia desfasada
a este diseño original — no se considera un defecto, solo una
imprecisión de redacción.

### Frontend — conexión con `CaseList.tsx` (SPEC-001)

`CaseList.tsx` (sin construir todavía — el plan/tareas de SPEC-001 ya
lo describen con un botón "New case" sin formulario inline) añade:
`const [dialogOpen, setDialogOpen] = useState(false)`, un botón "New
case" que lo pone a `true`, y `{dialogOpen && <NewCaseDialog
events={events} existingCases={allCases} onCreated={(eventId, caseId)
=> { setDialogOpen(false); onSelect(eventId, caseId); }} onClose={()
=> setDialogOpen(false)} />}`.

### Estilos — `apps/web/src/styles.css`

- Estilo del elemento `dialog`: borde, padding, border-radius, a juego
  con el lenguaje visual "papel" que ya tiene `.box` en `styles.css` —
  un `<dialog>` nativo no tiene estilo por defecto y necesita al menos
  un max-width y la misma tipografía/fondo que el resto de la app para
  no parecer un control de navegador pelado.
- `dialog::backdrop` — fondo oscurecido, convención habitual al usar
  `<dialog>`.
- Sin CSS de overlay propio (posicionamiento, z-index, atrapar foco) —
  el navegador se encarga de todo eso con `<dialog>`.

## Verificación

1. `npm run typecheck` en `apps/web`; `npm run build` en `apps/api`.
2. Manual, en vivo contra `http://192.168.1.105:8086/` tras redeploy:
   - Sin ninguna regata todavía (estado limpio, o una regata de
     prueba borrada antes) → el campo regatta es un input de texto.
   - Con al menos una regata → el campo regatta es un `<select>` con
     "New regatta…" como última opción; elegirla sustituye por un
     input de texto.
   - Número de caso duplicado en la misma regata → error mostrado,
     nada creado, confirmado también mirando `GET /cases` para
     comprobar que no llegó fila duplicada (prueba el check del
     backend, no solo el del frontend).
   - Crear con éxito → el popup se cierra, se abre directo el
     formulario del caso nuevo.
   - Escape y click en el backdrop del popup cierran sin crear nada.

## Explícitamente fuera de esta spec

- Día, carrera, partes, testigos — se rellenan después, dentro del
  caso, sin cambios.
- Editar una regata existente (venue/timezone) — sigue sin UI,
  pregunta abierta heredada de D-018, no resuelta aquí.
- Cualquier cosa del alcance propio de SPEC-001 más allá del botón
  "New case" (columnas del listado, menú admin-only, dropdown de
  usuario) — spec y plan aparte.

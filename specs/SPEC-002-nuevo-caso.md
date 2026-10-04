# SPEC-002 — Nuevo caso

Estado: draft (sin construir todavía)

Relacionado: `CLAUDE.md` (arquitectura), `constitution.md` (principios),
`SPEC-001-pantalla-de-entrada.md` (**esta spec sustituye su RF-004** —
ver nota abajo), `DECISIONS.md` D-018 (find-or-create original, ya no
aplica tal cual a este flujo).

## Intención

Botón "Nuevo caso" en la pantalla de entrada (SPEC-001) que abre un
popup con el mínimo imprescindible para crear un caso: nombre de la
regata y número de caso. Nada más en el popup — ni día, ni carrera, ni
partes; eso se rellena después, dentro del caso ya creado.

**Nota sobre SPEC-001:** esta spec sustituye el formulario inline de
crear caso que `SPEC-001-pantalla-de-entrada.md` (RF-004) y sus
`SPEC-001-plan.md`/`SPEC-001-tasks.md` describían encima del listado.
RF-004 y esos documentos quedan desactualizados por este cambio — se
corrigen como parte de las tareas de esta spec (ver "Tareas" al
final), no se duplican aquí.

## Alcance

**Dentro:**
- Botón "Nuevo caso" en la pantalla de entrada (SPEC-001).
- Popup con 2 campos: nombre de regata, número de caso.
- Campo de regata: si no hay ninguna regata todavía, input de texto
  libre. Si hay una o más, un `<select>` con las regatas existentes +
  una opción "New regatta…" que revela un input de texto para escribir
  el nombre.
- Número de caso: siempre texto libre.
- Al confirmar: crea la regata (si es nueva) y el caso, cierra el
  popup, abre el caso recién creado.
- Si el número de caso ya existe en la regata elegida: error en el
  popup, no crea nada, el usuario corrige el número.
- Cancelar: botón Cancel, tecla Escape, o click fuera del popup —
  cierra sin crear nada.

**Fuera (de esta spec):**
- Día, carrera, partes, testigos — se rellenan ya dentro del caso
  creado (pantalla de caso existente, sin cambios).
- Editar una regata existente (venue, timezone) — sigue sin tener UI
  propia (pregunta abierta heredada de D-018, no resuelta aquí).
- Vincular el caso nuevo con otro caso (`+ Link case…`) — eso ya existe
  dentro del formulario de caso, no en este popup.

## Usuarios y contexto

Cualquier usuario logeado puede crear un caso — esto no cambia con
SPEC-001 (el gate admin-only de SPEC-001 es solo para Upload
examples/rules/Users, no para crear casos).

## Requisitos

**RF-001 — Abrir el popup**
Dado un usuario en la pantalla de entrada, cuando hace click en "New
case", entonces se abre un popup con dos campos: regatta y case
number, y nada más.

**RF-002 — Campo regata sin regatas existentes**
Dado que no existe ninguna regata todavía, cuando se abre el popup,
entonces el campo regatta es un input de texto libre (no hay nada que
listar).

**RF-003 — Campo regata con regatas existentes**
Dado que existe al menos una regata, cuando se abre el popup, entonces
el campo regatta es un `<select>` con cada regata existente como
opción, más una opción final "New regatta…".

**RF-004 — Crear una regata nueva desde el popup**
Dado el popup con el select de regatas visible, cuando el usuario
elige "New regatta…", entonces aparece un input de texto para escribir
el nombre de la nueva regata, sustituyendo o complementando el select.

**RF-005 — Validación de caso duplicado**
Dado un número de caso que ya existe en la regata elegida (nueva o
existente), cuando el usuario confirma, entonces el popup muestra un
error y no crea nada — el usuario debe cambiar el número de caso.

**RF-006 — Confirmar crea y navega**
Dado el popup con regatta y case number válidos (case number no
duplicado en esa regata), cuando el usuario confirma, entonces: 1) si
la regata era nueva, se crea; 2) se crea el caso; 3) el popup se
cierra; 4) la app navega al formulario de ese caso recién creado.

**RF-007 — Cancelar sin crear nada**
Dado el popup abierto, cuando el usuario pulsa Cancel, pulsa Escape, o
hace click fuera del popup, entonces el popup se cierra y no se crea
ni regata ni caso.

**RF-008 — Idioma**
Todo el texto del popup (etiquetas, botones, mensajes de error) está
en inglés (`constitution.md` → Principios).

## Seguridad y privacidad

- Ningún campo del popup es sensible — sin cambios respecto al modelo
  de permisos actual (cualquier usuario logeado puede crear eventos y
  casos hoy, vía `POST /events`/`POST /cases`, sin guard de rol).

## Restricciones

- No hay tests automatizados (`constitution.md` → Calidad) —
  verificación manual en vivo.

## Decisiones técnicas

- Reutiliza `api.createEvent`/`api.createCase` tal cual existen hoy
  (`apps/web/src/api.ts`) — ningún endpoint nuevo necesario para crear.
- **Validación de duplicado (RF-005): backend-enforced, no solo
  frontend.** Índice `UNIQUE` real en `protest_case(event_id,
  case_number)` (`apps/api/db/schema.sql`) — dos pestañas abiertas a
  la vez podrían saltarse una comprobación solo-frontend. El frontend
  además pre-comprueba contra `GET /cases/summary` (SPEC-001) para dar
  feedback instantáneo, pero el backend es la autoridad. Decidido en
  `SPEC-002-plan.md` (sin pregunta abierta).
- **Mecanismo del popup: `<dialog>` nativo** (`showModal()`/`close()`)
  — da gratis Escape-para-cerrar, click-en-backdrop-para-cerrar y
  atrapar el foco; no hay ningún patrón de modal/overlay propio en el
  proyecto hoy que reutilizar, así que no hace falta construir uno a
  mano. Decidido en `SPEC-002-plan.md` (sin pregunta abierta).

## Tareas

Al pasar esta spec a plan/build, incluir también:
- Corregir `SPEC-001-pantalla-de-entrada.md` RF-004: ya no describe un
  formulario inline, sino que apunta a este SPEC-002 (botón "New
  case" → popup).
- Corregir `SPEC-001-plan.md`/`SPEC-001-tasks.md`: la tarea 6
  ("`CaseList.tsx`") ya no mueve el formulario inline de
  `CaseSelector.tsx` — ese formulario se descarta, `CaseList.tsx` solo
  lista y navega, el botón "New case" vive ahí pero abre este popup.

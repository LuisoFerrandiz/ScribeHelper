# SPEC-015 — Borrar un caso

Estado: draft.

Relacionado: `DECISIONS.md` D-026 (sesión/autenticación, un solo admin,
`requireAdmin` ya existente — mismo guard que esta spec reutiliza),
D-027 (adjuntos de caso, convertidos a Markdown al subir, original +
`.md` conservados juntos — por eso borrar un caso debe limpiar también
esos ficheros, no solo las filas de BD), `apps/api/db/schema.sql`
(todas las FK que referencian `protest_case(id)` tienen `ON DELETE
CASCADE`: `party`, `witness`, `case_rule_citation`,
`case_jury_member`, `case_link` en ambas direcciones,
`case_attachment`), `apps/api/src/routes/caseAttachments.ts` (ya tiene
el único precedente de limpieza de ficheros de adjunto al borrar,
`deleteAttachmentFiles` — se reutiliza, no se duplica),
`apps/api/src/routes/users.ts`/`resources.ts` (precedente de
`requireAdmin` en rutas destructivas de alto impacto — mismo criterio
aplicado aquí).

## Intención

Añadir un botón "Remove" al final de cada fila en el listado inicial
de casos (`CaseList.tsx`), que borra ese caso por completo: todos sus
datos (parties, testigos, jurado, citas de reglas, enlaces a otros
casos) y sus ficheros de adjunto en disco. Acción irreversible, mucho
más destructiva que cualquier otro "Remove" ya existente en la app
(que borran un testigo, una cita, un adjunto suelto o un miembro del
jurado — nunca un caso entero) — por eso, a diferencia del resto, pide
confirmación antes de actuar y queda restringida a usuarios admin
(decisiones confirmadas con el dueño, no asumidas).

## Alcance

**Dentro:**
- Backend: nueva ruta dedicada `DELETE /cases/:id` (sustituye, para
  `cases`, la ruta `DELETE` genérica que hoy registra
  `registerCrud(app, 'cases', ...)` — se añade una opción
  `skipDelete` a `registerCrud` para que `cases` no registre la
  genérica), protegida con `requireAdmin` (mismo guard que
  `/users/:id` y `/resources/:id`). Antes de borrar la fila de
  `protest_case` (que cascada el resto vía `ON DELETE CASCADE`), borra
  los ficheros en disco de cada `case_attachment` del caso, vía
  `deleteAttachmentFiles` — mismo helper que ya usa
  `DELETE /attachments/:id`, sin duplicar lógica.
- Frontend: `api.deleteCase(id)`; botón "Remove" al final de cada fila
  de `CaseList.tsx`, visible solo si `user.role === 'admin'`
  (`CaseList` recibe `user` como prop nueva, pasada desde `App.tsx`,
  donde ya existe en `useState<SessionUser | null>`).
- Confirmación antes de borrar: `window.confirm()` con el número de
  caso, sin componente de diálogo nuevo — primer uso de este patrón en
  la app, justificado por ser la primera acción de este nivel de
  irreversibilidad (decisión confirmada con el dueño).
- Tras confirmar y borrar, la fila desaparece del listado (recarga la
  lista, mismo patrón que `NewCaseDialog`'s `onCreated` ya usa).
- El clic en "Remove" nunca dispara también la navegación al caso
  (`stopPropagation`, ya que la fila entera es clicable para abrir el
  caso).

**Fuera de esta spec:**
- Borrado en lote (varios casos a la vez).
- Papelera / deshacer — el borrado es inmediato y permanente en cuanto
  se confirma, sin periodo de gracia.
- Cualquier cambio a los otros botones "Remove" ya existentes
  (testigo, regla, adjunto, jurado) — siguen actuando al instante, sin
  confirmación, sin guard de admin, sin cambios.
- Borrar un evento/regata entero (ya tiene su propio `ON DELETE
  CASCADE` desde `event`, pero no hay UI para ello y no es parte de
  esta spec).

## Requisitos funcionales

- **RF-001 — Botón visible solo para admin.** El botón "Remove"
  aparece al final de cada fila del listado de casos únicamente si el
  usuario logueado es admin. Un usuario no-admin no lo ve.
- **RF-002 — Confirmación antes de borrar.** Pulsar "Remove" muestra
  un diálogo de confirmación nombrando el número de caso **y el
  nombre de la regata** (`case_number` no es único globalmente, solo
  por evento — `UNIQUE (event_id, case_number)` — así que dos regatas
  distintas pueden tener ambas un "Case 1"; nombrar solo el número
  sería ambiguo con el listado agrupado por regata delante); cancelar
  no cambia nada.
- **RF-003 — Borrado completo.** Confirmar borra el caso y todo lo que
  cuelga de él: parties, testigos, jurado asignado, citas de reglas,
  enlaces con otros casos (en ambas direcciones) — verificable
  consultando la BD tras borrar (ninguna fila huérfana).
- **RF-004 — Ficheros de adjunto también se borran.** Si el caso tenía
  adjuntos (protest forms), sus ficheros en disco
  (`data/case_attachments/` y `data/case_attachments/originals/`)
  desaparecen, no solo las filas de BD.
- **RF-005 — Backend rechaza a quien no es admin.** Un intento de
  `DELETE /cases/:id` por un usuario no-admin devuelve 403, igual que
  ya hace `/users/:id`.
- **RF-006 — Sin regresión.** Los demás botones "Remove" de la app
  (testigo, regla, adjunto suelto, jurado) siguen actuando igual,
  instantáneos, sin confirmación, sin guard de admin.

## Decisiones técnicas

- Ruta dedicada en vez de dejar la genérica de `registerCrud` — la
  genérica no limpia ficheros de disco ni tiene guard de admin; opción
  `skipDelete` en `CrudOptions` para que `cases` deje de registrar
  la suya y no choque con la nueva.
- `deleteAttachmentFiles` reutilizado tal cual (ya probado, ya
  maneja el caso de que el fichero no exista) — no se reimplementa
  limpieza de disco.
- Confirmación con `window.confirm()` nativo, no un componente de
  diálogo propio — el único borrado de este calibre en la app hoy;
  si en el futuro aparecen más acciones igual de destructivas, se
  puede extraer un componente compartido entonces, no antes (YAGNI).

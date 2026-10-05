# SPEC-009 — Repaso y Lectura

Estado: draft.

Relacionado: `CLAUDE.md` (El documento de decisión — las ocho cajas en
orden fijo), `constitution.md` → Principios (UX se define antes que la
implementación, D-028), `DECISIONS.md` D-021 (jurado en dos niveles:
`jury_member` = pool del evento, `case_jury_member` = quién se sienta
en este caso en concreto), `SPEC-005`..`SPEC-008` (las cuatro cajas de
redacción y sus paneles de sugerencias — sin cambios aquí). Sustituye
la pestaña "2. Jury" de `CaseForm.tsx` que se quitó el 2026-10-05
(conversación previa) — esta es la "nueva spec dentro de una nueva
pestaña" que se prometió entonces.

## Intención

Antes de exportar la decisión, el juez necesita una última pasada: leer
y, si hace falta, corregir las cuatro cajas de redacción (Procedural
Matters, Facts Found, Conclusion, Decision) **sin saltar de pestaña en
pestaña**, y dejar fijado el panel de jueces de este caso. Pestaña
nueva, última de la pestaña de caso, de solo texto plano + selección de
jurado — sin paneles de sugerencias (esos ya se usaron en las pestañas
individuales durante la redacción; aquí es repaso, no composición).

## Alcance

**Dentro:**
- Pestaña nueva en `CaseForm.tsx` ("6. Review", después de "5.
  Decision"), con dos bloques:
  1. **Las cuatro cajas de redacción**, en orden fijo del documento,
     como `<textarea>` simples (mismo componente de caja de texto que
     ya existe — Literata, mismo tamaño — sin `SuggestionsPanel` al
     lado). Editar aquí modifica el mismo estado de React que ya usan
     las pestañas 2-5 (`proceduralMatters`, `factsFound`, `conclusion`,
     `decision` en `CaseForm.tsx`) — no hay sincronización que
     construir, es el mismo dato; cambiar aquí y volver a la pestaña
     "3. Facts Found" (p. ej.) muestra el cambio ya hecho, y viceversa.
     Se guarda con el mismo botón Save de la pestaña General (sin
     botón de guardado propio).
  2. **Jurado de este caso** — fila con **5 cuadros** (constante, no
     configurable todavía — ver "Fuera de esta spec"), cada uno un
     `<select>` con los jueces del pool del evento (`jury_member`,
     filtrado por `event_id` del caso — mismo filtro que ya usaba la
     pestaña Jury quitada y que sigue usando `JuryPanel.tsx`). Junto a
     cada `<select>` un checkbox "Chairman" — solo uno puede estar
     marcado a la vez (marcar uno desmarca los demás). Un botón **"+
     New judge"** abre un campo de nombre; al confirmar, crea la
     persona si no existe (mismo `findOrCreatePerson` ya usado para
     testigos/partes) + la añade al pool del evento
     (`createJuryMember`), y la asigna automáticamente al primer hueco
     libre de los 5.
- El botón "Download decision (.html)" **ya está arriba, en todas las
  pestañas** (`tab-bar-row`, fuera del contenido de cada pestaña) — no
  se duplica ni se mueve, ya cumple "en la parte de arriba" para esta
  pestaña igual que para las demás.
- Backend: `GET /cases/:id/full` expone `person_id` en cada fila de
  `jury` (hoy solo da `id`, `is_chairman`, `full_name` — hace falta
  `person_id` para saber qué opción del `<select>` está seleccionada,
  sobre todo si dos jueces compartieran nombre).
- `apps/web/src/api.ts`: añadir `updateCaseJuryMember` (el backend ya
  tiene `PUT /case-jury-members/:id` vía `registerCrud`, solo falta el
  wrapper del cliente).
- Backend: `apps/api/src/routes/crud.ts`, handler `PUT` genérico —
  capturar `UNIQUE constraint failed` igual que ya hace el `POST`
  (`case_jury_member` tiene `UNIQUE(case_id, person_id)`; cambiar el
  nombre de un cuadro ya ocupado al mismo juez que otro cuadro de este
  caso pasa por `PUT`, no por `POST`, y hoy ese camino no está
  cubierto — 500 sin manejar).
- Revisión QA del agente `reviewer` (2026-10-05) encontró 3 huecos que
  esta versión ya incorpora: (1) `JurySlots` no puede refrescarse con
  el `reload()` genérico de `CaseForm.tsx` — ese `reload()` también
  pisa `proceduralMatters`/`factsFound`/`conclusion`/`decision` con los
  valores ya guardados en servidor, borrando cualquier edición sin
  guardar hecha en la misma pestaña Review; (2) dos cuadros no pueden
  apuntar al mismo juez (choca con `UNIQUE(case_id, person_id)`); (3)
  "reusa `findOrCreatePerson`" se cumple pasándola como prop desde
  `CaseForm.tsx`, no duplicándola dentro de `JurySlots.tsx`.

**Fuera de esta spec:**
- Número de jueces configurable — 5 es una constante
  (`JURY_SLOT_COUNT`) en el código, no un ajuste de evento/caso. Si un
  caso ya tiene más de 5 (dato antiguo), se muestran todos sin truncar
  (slots = `max(5, jury.length)`), pero no se puede añadir un 6º desde
  cero sin tocar la constante.
- Reordenar los 5 cuadros a mano (drag-and-drop) — el orden en pantalla
  es el de creación (`case_jury_member.id`), no editable.
- Configuración del HTML exportado (plantilla, qué aparece) — mencionado
  explícitamente como "más tarde" por el dueño; no es parte de esta
  spec.
- Tocar `format.ts` (`formatJuryMembers`, `formatFullDecisionHtml`) —
  ya muestra chairman + resto correctamente, sin cambios.
- Borrar/mover la pestaña "Jury" del nivel de evento (`JuryPanel.tsx`,
  nav superior) — sigue siendo el sitio donde se gestiona el pool
  completo del evento; esta spec solo consume ese pool, no lo
  reemplaza.
- Botón "Copy" en las cuatro cajas de la pestaña Review — intencional:
  Review es para leer/corregir, copiar una caja sigue haciéndose desde
  su pestaña propia (2-5), que ya tiene su `CopyBox`.

## Requisitos funcionales

- **RF-001 — Pestaña Review.** Nueva pestaña "6. Review" al final de
  la barra de pestañas del caso.
- **RF-002 — Cuatro cajas, mismo estado.** Las cuatro cajas de
  redacción se editan en esta pestaña sobre el mismo estado de React
  que las pestañas individuales; ningún dato nuevo, ninguna
  sincronización manual.
- **RF-003 — 5 cuadros de jurado con dropdown.** Cada cuadro es un
  `<select>` poblado con el pool de jueces del evento; vacío si no hay
  jueces aún en el pool. Elegir un nombre en un cuadro vacío crea la
  fila (`case_jury_member`); cambiar el nombre de un cuadro ya asignado
  la actualiza (mismo registro, no se borra y recrea); volver a "— sin
  asignar —" la borra.
- **RF-004 — Un solo chairman.** Checkbox "Chairman" junto a cada
  cuadro ocupado; marcar uno desmarca cualquier otro que estuviera
  marcado (nunca dos a la vez). Puede no haber ninguno.
- **RF-005 — Crear juez desde aquí.** Formulario siempre visible (no
  un botón que abre/cierra algo, simplemente un campo + botón "+ New
  judge" debajo de los 5 cuadros): nombre → persona (reusa o crea) → se
  añade al pool del evento → se asigna automáticamente al primer cuadro
  libre de este caso. Si los 5 ya están ocupados, se añade al pool
  igualmente (queda disponible en los `<select>`) pero no se asigna a
  ningún cuadro.
- **RF-006 — `person_id` en el jury del caso.** `GET /cases/:id/full`
  devuelve `person_id` por cada miembro del jurado del caso, no solo el
  nombre ya resuelto.
- **RF-007 — Refrescar sin perder ediciones sin guardar.** Cualquier
  cambio en los 5 cuadros (asignar, cambiar, quitar, marcar chairman,
  crear juez) refresca solo `caseFull.jury`, nunca las cuatro cajas de
  redacción — si el juez tiene texto sin guardar en Procedural
  Matters/Facts Found/Conclusion/Decision (en esta pestaña o en
  cualquier otra) y en la misma visita toca algo del jurado, ese texto
  sigue en pantalla exactamente igual después.
- **RF-008 — Un juez no puede ocupar dos cuadros.** Cada `<select>`
  excluye los nombres ya asignados a *otro* cuadro de este mismo caso
  (sigue listando el suyo propio, para poder dejarlo tal cual). Si aun
  así se produce un intento de duplicado (p. ej. condición de carrera
  entre dos cambios rápidos), el error 409 del backend se captura y se
  muestra como mensaje, no como fallo silencioso ni crash.

## Decisiones técnicas

- El selector de jurado es un componente nuevo (`JurySlots.tsx`), no
  código inline en `CaseForm.tsx` — tiene su propio estado (pool del
  evento) y llamadas a la API, mismo criterio de tamaño que ya separó
  `PartyReference.tsx`/`SuggestionsPanel.tsx` del resto del formulario.
- Las cuatro cajas de redacción sí quedan inline en `CaseForm.tsx` —
  son `<textarea>` simples atadas a estado que ya existe ahí, extraer
  un componente no ahorraría nada.
- `findOrCreatePerson` se pasa como **prop** desde `CaseForm.tsx` a
  `JurySlots.tsx` (en vez de que `JurySlots` defina su propia copia) —
  es la única forma real de "reusar" la función ya existente en vez de
  triplicar el mismo patrón que ya está en `JuryPanel.tsx`.
- `JurySlots` nunca llama al `reload()` genérico de `CaseForm.tsx` (ese
  pisa las cuatro cajas de texto con lo último guardado en servidor,
  ver RF-007) — recibe una función `onJuryChange` dedicada que solo
  actualiza `caseFull.jury`.

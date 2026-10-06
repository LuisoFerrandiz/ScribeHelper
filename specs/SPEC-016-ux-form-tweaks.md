# SPEC-016 — Ajustes de UX: General en filas, With case(s) con nota libre, varios initiators/respondents, informed-at en Decision/Review

Estado: draft.

Relacionado: `SPEC-010-general.md` (construyó el apartado "General" tal
como existe hoy — con `.general-fields-row`, campos en una sola línea
— y quitó el input de "Informed at" de la UI "por ahora", congelando
el dato; esta spec no la edita, pero cambia ambas cosas), `SPEC-004-general-parties.md`
(primera versión de Parties & Witness, un initiator/un respondent
fijos), `SPEC-011-general-parties-split.md` (separó "Parties &
Witness" de "General" en su propia pestaña), `SPEC-006-facts-found.md`
(`PartyReference`, resaltado por substring), `SPEC-008-decision.md`
(mismo `PartyReference` extendido con `race`), `SPEC-014-unified-save.md`
(el único botón Save, `handleSaveAll`, que esta spec extiende con la
reconciliación de parties y el campo `with_case_note` — sustituye por
completo el guardado por pestaña que tenía SPEC-011), `DECISIONS.md`
D-027 (adjuntos de caso, sin relación directa pero mismo criterio de
"no duplicar lo ya construido"), D-029 (coherencia interna, regla 1 —
ver la nota explícita más abajo sobre por qué "Informed at" no entra
en el `CopyBox` de Decision), `apps/api/db/schema.sql`/`apps/api/src/db/migrate.ts`
(primera migración real de esquema de este proyecto — añade una
columna a una tabla ya existente, nunca hecho antes; todas las tablas
hasta ahora se crearon completas desde el principio).

## Intención

Cinco ajustes de UX pedidos juntos por el dueño porque son pequeños
por separado pero tocan varias pestañas a la vez:

1. **"1. General" en filas, no en una línea.** Hoy
   `.general-fields-row` pone Case number/Day/Race/With case(s) en una
   fila flex que se envuelve (`flex-wrap`) si no cabe — visualmente
   distinto del resto de la app. Debe verse como "2. Parties &
   Witness": cada campo en su propia fila, mismo patrón que ya usa
   `.party-row` (etiqueta en negrita + input, una fila por campo,
   filas apiladas verticalmente).
2. **"With case(s)" gana una nota de texto libre.** Hoy solo permite
   vincular casos que ya existen como fila en la misma regata
   (`case_link`, selector + chips). Se añade un campo de texto libre
   al lado — para casos que el jurado quiere anotar y que no están en
   el sistema (de otra regata, o que aún no se ha creado) — sin quitar
   el selector estructurado, que sigue siendo útil para casos reales
   de la misma regata.
3. **Varios initiators y varios respondents.** Hoy "Parties" tiene
   exactamente un initiator y un respondent, editables in situ (3
   inputs vinculados directamente al estado, sin lista). El dueño
   confirmó que esto debe ser funcional de verdad, no solo "dejar
   hueco": varios de cada rol, añadidos/quitados como lista — **mismo
   patrón que Witness ya usa hoy** (lista de solo lectura + Remove, más
   un mini-formulario "Add" debajo), para que Parties y Witness se vean
   y se comporten lo más parecido posible, tal como pidió el dueño. La
   base de datos ya lo soporta sin cambios (`party.role` no tiene
   `UNIQUE`, cualquier número de filas por rol y caso ya es válido) —
   todo el trabajo es de frontend, más algo de backend en la lista de
   casos y la exportación.
4. **Fecha/hora en que se informó a las partes de la decisión — de
   vuelta a la UI, en Decision y en Review.** El campo `informed_at`
   existe en la base de datos desde el principio del proyecto
   (`protest_case.informed_at`) y ya aparece en el `.html` exportado
   (`format.ts`: "Parties informed of the decision (Date & time):
   ..."), pero SPEC-010 quitó su único input de la UI "por ahora",
   dejando el dato congelado al valor que ya tuviera cada caso. Esta
   spec reconecta ese mismo campo — nunca se tocó el modelo de datos —
   con un input nuevo en la pestaña Decision y otro en Review (mismo
   campo, mismo estado compartido, igual que ya pasa con Procedural
   Matters/Facts Found/Conclusion/Decision entre su pestaña propia y
   Review).

## Alcance

**Dentro:**
- JSX de "1. General" reestructurado a filas apiladas (`.party-row`
  reutilizado, o una variante mínima si hace falta), sin cambiar qué
  campos existen salvo el punto 2.
- Columna nueva `protest_case.with_case_note TEXT` (nullable) —
  **primera migración real de este proyecto**: `schema.sql` la añade al
  `CREATE TABLE` (para una base de datos nueva, creada desde cero) y
  `migrate.ts` gana un `ALTER TABLE ... ADD COLUMN` guardado por
  `PRAGMA table_info` (para la base de datos ya desplegada, donde
  `CREATE TABLE IF NOT EXISTS` no toca una tabla que ya existe). Se
  ejecuta sola en el próximo "Pull and redeploy" (el `Dockerfile` ya
  corre `migrate.js` antes de arrancar el servidor, en cada arranque).
- `with_case_note` añadido a los campos editables de `registerCrud(app,
  'cases', ...)`, al tipo `CaseRow`, al estado de `CaseForm.tsx`, al
  `PATCH` de `handleSaveAll`, y mostrado en el `.html` exportado junto
  a los casos vinculados.
- Modelo de "Parties" en `CaseForm.tsx` pasa de dos objetos únicos
  (`initiator`/`respondent`) a dos listas (`PartyDraft[]` por rol),
  mismo patrón de staging que `witnessDraft` ya usa: lista de
  solo-lectura con "Remove", mini-formulario "Add" con los 3 campos
  (sail number/boat name/represented by), reconciliado contra el
  servidor solo al pulsar el único Save (SPEC-014) — igual que
  Witness, **sin edición in situ de una fila ya guardada**: para
  corregir un dato se quita y se vuelve a añadir (mismo comportamiento
  que Witness ya tiene hoy, nunca tuvo edición in situ tampoco).
- "Use suggested" de initiator/respondent (desde la extracción IA)
  pasa de "sobrescribir el único slot" a "añadir una entrada nueva a
  la lista" — mismo patrón que `addSuggestedWitness` ya usa.
- Todo lo que hoy asume un solo initiator/un solo respondent se
  actualiza para iterar una lista: `format.ts` (`formatParties`,
  `formatAutoProceduralLines`, `formatFullDecisionHtml`),
  `PartyReference.tsx` (una fila por party, no una fija por rol),
  `SuggestionsPanel.tsx` (`PartyReferenceData` con arrays),
  `apps/api/src/routes/caseSummary.ts` (`byRole` devuelve todas las
  filas, no solo la primera) y `CaseList.tsx` (columnas
  Initiator/Respondent muestran varios, unidos por coma).
- Input nuevo "Informed at (date & time)" en la pestaña Decision y
  otro igual en Review — mismo `useState informedAt` ya existente
  (nunca se borró, solo su único input en General desapareció en
  SPEC-010), mismo campo en el `PATCH` de `handleSaveAll` (ya viaja
  ahí sin cambios desde SPEC-010/SPEC-014).

**Fuera de esta spec:**
- Tocar `extract.ts`/el prompt de IA — sigue proponiendo un único
  candidato de initiator y uno de respondent (realista: un protest
  form normal no declara varios a la vez); "Use suggested" simplemente
  añade ese candidato como una entrada más a la lista, no hace falta
  que la IA proponga varios.
- Cualquier editor de texto enriquecido para `with_case_note` — input
  de texto simple, una línea.
- Deshacer/papelera para Parties (igual que Witness, quitar una fila
  de la lista antes de guardar es instantáneo y sin confirmación,
  consistente con cómo ya funciona Witness).
- Tocar `SPEC-010-general.md`/`SPEC-004-general-parties.md` — quedan
  citadas, no editadas.

## Requisitos funcionales

### General (RF-1xx)
- **RF-101 — Filas apiladas.** "1. General" muestra Case number / Day
  (+ Use suggested) / Race (+ Use suggested) / With case(s) / With
  case(s) notes cada uno en su propia fila, visualmente igual que las
  filas de Parties (etiqueta + input, una fila por campo).

### With case(s) (RF-2xx)
- **RF-201 — Nota de texto libre adicional.** Debajo (o al lado) del
  selector/chips de casos vinculados existentes, un campo de texto
  libre editable, guardado con el único botón Save del caso
  (`with_case_note`), que no sustituye ni interfiere con el selector
  estructurado.
- **RF-202 — Aparece en el export.** El `.html` descargado muestra la
  nota de texto libre junto a los casos vinculados (si hay alguno de
  los dos, o ambos).

### Parties (RF-3xx)
- **RF-301 — Varios initiators, varios respondents.** Se pueden añadir
  y quitar tantos initiators y tantos respondents como se quiera, cada
  uno con sail number/boat name/represented by propios.
- **RF-302 — Mismo patrón que Witness.** Lista de solo lectura + botón
  Remove por fila, formulario "Add" con los 3 campos debajo, igual
  estructura visual que la sección Witness de la misma pestaña.
- **RF-303 — "Use suggested" añade, no sobrescribe.** Si la extracción
  IA propone un initiator/respondent, el botón correspondiente añade
  una entrada nueva a la lista de ese rol (no reemplaza ninguna
  existente).
- **RF-304 — Persistencia correcta.** Al pulsar Save: las entradas
  quitadas de la lista se borran en el servidor
  (`DELETE /parties/:id`), las nuevas se crean
  (`POST /parties`, reutilizando `findOrCreateBoat`/`findOrCreatePerson`
  igual que hoy); las que no cambiaron no generan ninguna llamada.
- **RF-305 — Consumidores de parties muestran todos, no solo el
  primero.** `format.ts` (texto plano Copy y `.html` exportado),
  `PartyReference` (panel de Facts Found/Decision), y la columna
  Initiator/Respondent del listado de casos (`CaseList.tsx`) reflejan
  todas las entradas de cada rol, no solo una.

### Decision / Review (RF-4xx)
- **RF-401 — Input en Decision, fuera de la caja de texto.** La
  pestaña "6. Decision" tiene un campo "Informed at (date & time)"
  ligado a `informedAt`, en una sección de formulario propia **fuera**
  del `CopyBox` de Decision (no mezclado con el textarea/panel de
  sugerencias) — igual que "General" es su propia sección de
  formulario separada de las cajas de documento, por D-029 regla 1
  ("si una pestaña presenta su información como formulario, todo lo de
  esa pestaña es formulario — nunca mezclado con cajas de texto libre
  dentro de la misma pestaña"). Meterlo dentro del `CopyBox` de
  Decision mezclaría un campo de formulario con una caja de documento
  en la misma pestaña, el mismo problema que SPEC-011 resolvió sacando
  "General" de "Parties & Witness".
- **RF-402 — Mismo campo en Review.** La pestaña "7. Review" tiene el
  mismo campo, mismo estado compartido (editar en una pestaña se
  refleja en la otra sin guardar, igual que ya pasa con Procedural
  Matters/Facts Found/Conclusion/Decision).
- **RF-403 — Sin regresión en el export.** El `.html` descargado sigue
  mostrando "Parties informed of the decision (Date & time): ..." con
  el valor actual, como ya hace hoy.

## Decisiones técnicas

- **Primera migración de esquema real.** Hasta ahora toda tabla se creó
  completa desde el principio (`CREATE TABLE IF NOT EXISTS`); añadir
  `with_case_note` a `protest_case`, una tabla que ya existe en la base
  de datos desplegada con datos reales, exige un `ALTER TABLE` que
  `schema.sql` por sí solo no puede dar — se añade explícitamente a
  `migrate.ts`, guardado con `PRAGMA table_info` para no fallar si ya
  se aplicó (el script corre en cada arranque del contenedor, no solo
  una vez).
- **Parties pasa a "add/remove" puro, igual que Witness — sin editar
  in situ.** Es el cambio mínimo que logra "lo más parecido posible" a
  Witness (que tampoco permite editar una fila ya guardada) y evita
  diseñar dos mecanismos de guardado distintos para dos listas que
  ahora se ven y actúan igual.
- `PartyDraft` (nuevo tipo local en `CaseForm.tsx`) espeja
  `WitnessDraft`: `{ id: number | null; ...campos }`, mismo criterio
  de "null = no persistido todavía, creado en el próximo Save".
- `PartyReferenceData`/`PartyReference` cambian de `initiator`/
  `respondent: Party` a `initiators`/`respondents: Party[]` — si un
  rol no tiene ninguna entrada, se sigue mostrando una fila "—" (mismo
  comportamiento visual que hoy para el caso vacío).
- `api.updateParty` se borra — sin edición in situ, su único llamador
  (`savePartyRole`) desaparece con el resto de esa función; nada más
  en el frontend lo usa. Sin código muerto tras el cambio (mismo
  criterio que SPEC-014 aplicó a `CopyBox.tsx`).

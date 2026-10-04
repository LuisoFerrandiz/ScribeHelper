# SPEC-004 — General & Parties

Estado: **ya implementado y desplegado**. Esta spec documenta el
comportamiento existente — no describe trabajo pendiente.

Relacionado: `CLAUDE.md` (El documento de decisión — capas de datos),
`SPEC-003-documentacion-previa.md` (origen de las sugerencias que esta
pantalla puede usar), `DECISIONS.md` D-018 (regata/caso no editables
aquí, fijados al crear), `constitution.md` → Principios (R-06/R-07:
nada se escribe sin acción explícita del usuario).

## Intención

Segundo tab del caso ("1. General & Parties"), inmediatamente después
de "0. Protest Form(s)". Reúne los datos de encabezado del caso (día,
prueba, hora de aviso, casos vinculados) y las partes (Initiator,
Respondent, Witnesses) — todo editable directamente por el usuario,
con sugerencias opcionales provenientes de la extracción de SPEC-003.

## Alcance

**Dentro (ya construido):**
- Formulario de metadatos: Case number, Day, Race, Informed at (event
  time), With case(s) (vincular/desvincular otros casos del mismo
  evento).
- Parties: Initiator y Respondent, cada uno con Sail number, Boat
  name, Represented by — editables, con autocompletado (`<datalist>`)
  contra barcos/personas ya existentes en el evento.
- Witnesses: lista editable (Full name + Role), añadir/quitar.
- Botón "Use suggested" por party, y "Add" por witness sugerido —
  ambos solo visibles si hay una `extraction` de SPEC-003 cargada en
  memoria (requiere haber pulsado "Process" en el tab "0." durante
  esta misma sesión de edición del caso).
- Un único botón "Save" persiste junto: metadatos + parties +
  witnesses + las cuatro cajas de texto libre (`handleSaveGeneral`).

**Fuera (no construido, no parte de esta spec):**
- Editar el nombre del evento o el número de caso desde aquí para
  *otro* caso — el evento se fija al crear el caso (SPEC-002), se
  muestra solo como título de pantalla (`Case {event.name} — {case
  number}`), no es un campo editable de este formulario.
- Campos de barco (sail number/boat name/represented by) en Witness —
  explícitamente descartado (ver Decisiones técnicas).
- Auto-rellenar parties/witnesses sin acción del usuario al terminar
  "Process" — explícitamente descartado (ver Decisiones técnicas).

## Modelo de datos

- Case: `case_number`, `day`, `race`, `informed_at`, `event_id` (fijo
  desde creación).
- `party` (uno por rol `initiator`/`respondent`, por caso): `boat_id`
  (resuelto por sail number/boat name) + `represented_by_id` (resuelto
  por nombre de persona).
- `witness`: `full_name`, `role`, por caso — **sin** referencia a
  barco. Un witness es una persona, no una entidad con barco propio;
  su `role` (ej. "umpire", "protestee's witness") ya da el contexto
  necesario.
- `case` → `linked_case` (N:N, "With case(s)").

## Origen de los datos — sugerencias, no lectura directa de un `.md`

Las sugerencias que aparecen en esta pantalla **no leen el `.md` de
ningún adjunto directamente**. El flujo real, heredado de SPEC-003:

1. En el tab "0. Protest Form(s)", el usuario pulsa "Process" →
   `extractFromAttachments(caseId)` lee el/los `.md` de los adjuntos y
   devuelve un JSON (`AttachmentExtraction`) — se guarda en memoria del
   componente (`extraction`), no en la base de datos.
2. En este tab, por cada campo con sugerencia disponible aparece un
   botón explícito: "Use suggested" (parties, `useSuggestedParty`,
   `CaseForm.tsx:370-379`) o "Add" (witness,
   `addSuggestedWitness`/`CaseForm.tsx:381-383`).
3. Nada se escribe en el formulario sin ese click — coherente con
   `constitution.md` (nada se escribe sin acción explícita, misma
   regla que ya aplica a Procedural Matters/Facts Found).
4. Si el usuario no pulsó "Process" en esta sesión, no hay sugerencias
   que ofrecer — los campos quedan vacíos o con lo que ya estaba
   guardado, sin ningún indicio de "faltan sugerencias" (no es un
   error, es ausencia de extracción).

## Seguridad y privacidad

- Sin cambios respecto al resto del caso: mismos campos, misma
  persistencia vía `PUT` del caso existente.
- No introduce ningún dato nuevo desde fuera del corpus de personas/
  barcos del propio evento (`people`, `boats` ya cargados por evento).

## Decisiones técnicas

- **Witnesses sin sail number/boat/represented by** — decisión
  explícita del usuario en esta spec: un witness es una persona, el
  campo `role` ya cubre el contexto de a qué parte apoya o qué función
  cumple. Si en el futuro se necesita vincular un witness a un barco
  concreto, es un cambio de esquema nuevo, no implícito en esta spec.
- **Sugerencia manual, no auto-rellenado** — decisión explícita del
  usuario en esta spec, confirmando el patrón ya usado por Procedural
  Matters/Facts Found (SPEC-003): el usuario revisa y decide insertar,
  la IA nunca escribe directamente.
- Evento y número de caso no editables como "regata" aquí — hereda
  D-018 (edición de una regata existente sigue sin UI, pregunta
  abierta no resuelta en esta spec).

## Explícitamente fuera de esta spec

- Añadir campos de barco a Witness.
- Auto-rellenado sin click.
- Editar venue/timezone de la regata desde cualquier pantalla (D-018,
  sigue abierto).
- Cualquier cambio a Jury (tab aparte, SPEC propia si se necesita) o a
  las cajas de texto libre (Procedural Matters, Facts Found,
  Conclusion, Decision — specs propias).

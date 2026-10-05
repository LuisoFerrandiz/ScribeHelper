# SPEC-010 — General

Estado: draft.

Relacionado: `SPEC-004-general-parties.md` (Parties & Witness — el
fichero no se edita, por convención del repo, pero esta spec deja
parcialmente desactualizada su sección de metadatos: "Informed at
(event time)" aparece ahí como "ya construido" y pierde su UI aquí;
Parties/Witness en sí no cambian, solo gana un apartado hermano
encima), `SPEC-003-documentacion-previa.md` (documenta campo por campo
el `AttachmentExtraction` actual como "ya construido" — esta spec le
añade `day_candidate`/`race_candidate`, dejando esa lista también
parcialmente desactualizada a partir de aquí, mismo criterio que D-021
aplicó para CONTEXT.md/SPEC-004), `SPEC-005`..`SPEC-009` (patrón de
sugerencia click-to-insert ya establecido), `CLAUDE.md` (el documento
de decisión — Case number/Day/Race/With case(s) no son ninguna de las
ocho cajas fijas del documento, son metadatos del caso),
`DECISIONS.md` D-028 (separación UX/lógica, componentes no embeben
lógica de negocio).

## Intención

El bloque actual "Case number / Day / Race / Informed at (event time)
/ With case(s) / Save" (`.case-meta` en `CaseForm.tsx`) es visualmente
de una versión anterior del diseño — no sigue el sistema de tokens de
la pasada de rediseño reciente, y se percibe como un cuadro suelto sin
relación visual con el resto. Se quita, y sus campos (menos "Informed
at", que se congela por ahora) pasan a un apartado nuevo, propio,
llamado **"General"**, encima de la sección Parties & Witness — mismo
sitio funcional que ocupaban antes, con un tratamiento visual acorde
al resto de la aplicación. Day y Race, además, ganan autorrelleno
desde el protest form ya subido, con el mismo patrón de sugerencia que
ya usan Initiator/Respondent (nunca escribe solo, el usuario decide
pulsando "Use suggested").

## Alcance

**Dentro:**
- Quitar el `<form className="case-meta">` actual y su CSS
  (`.case-meta`, `.case-meta label`, `.case-meta input`).
- Apartado nuevo "General" (`<section className="box"><h2>General</h2>`),
  **separado** de la caja de Parties & Witness (no fusionado), justo
  encima de ella, dentro del mismo tab "1. General & Parties". Sin
  `CopyBox` — estos campos no son contenido copiable del documento
  fijo (CLAUDE.md sección "El documento de decisión").
- Dentro del apartado "General": Case number (tal cual, `required`),
  Day (tal cual + sugerencia IA), Race (tal cual + sugerencia IA),
  With case(s) (tal cual, sin IA — acción inmediata, fuera del Save
  batcheado, como ya es hoy), botón Save (sigue siendo
  `handleSaveGeneral` sin cambios en su cuerpo).
- Quitar "Informed at (event time)" de la UI por completo. No se toca
  su `useState`, su persistencia en `handleSaveGeneral`, el esquema de
  BD, ni `format.ts` — el valor que ya tuviera cada caso se conserva,
  simplemente no hay forma de editarlo desde pantalla por ahora.
- Extracción IA de `day_candidate`/`race_candidate` desde el protest
  form (backend: `apps/api/src/ai/extract.ts`; frontend: tipo
  duplicado en `apps/web/src/types.ts`), con botones "Use suggested"
  condicionales junto a Day y Race, mismo patrón que
  `useSuggestedParty`.

**Fuera de esta spec:**
- Reintroducir "Informed at" en algún sitio — pendiente de decisión
  futura del dueño.
- Fusionar "General" con la caja de Parties & Witness — el usuario
  pidió explícitamente un apartado separado.
- Tocar el esquema de base de datos — `day`/`race` ya existen en
  `protest_case`, ya se leen/guardan.
- Tocar `SPEC-004-general-parties.md` ni ningún fichero de spec ya
  cerrada — esta es una spec nueva sobre un área ya construida.

## Requisitos funcionales

- **RF-001 — Apartado "General" nuevo.** Caja propia
  (`<section className="box">`), con su `<h2>General</h2>`, separada
  de Parties & Witness, situada encima de ella.
- **RF-002 — Campos movidos, editables.** Case number, Day, Race, With
  case(s) viven dentro del apartado "General"; todos siguen siendo
  inputs controlados, editables libremente por el usuario, sin
  restricción nueva.
- **RF-003 — Guardado batcheado sin cambio de comportamiento.** El
  botón Save del apartado "General" sigue disparando
  `handleSaveGeneral`, que guarda junto: case number, day, race,
  parties, witnesses y las 4 cajas de texto. With case(s) se sigue
  guardando al instante (`handleLinkCase`/`handleRemoveLink`), fuera
  del botón Save, como ya ocurre hoy.
- **RF-004 — "Informed at" fuera de la UI.** Ningún input visible para
  este campo en ningún sitio de la pantalla; el valor ya guardado de
  cada caso no se pierde ni se borra al guardar.
- **RF-005 — Sugerencia IA para Day.** Si `extraction?.day_candidate`
  existe, aparece un botón "Use suggested" junto a Day; al pulsarlo,
  rellena el campo con ese valor. Nunca se aplica solo.
- **RF-006 — Sugerencia IA para Race.** Igual que RF-005, para Race y
  `extraction?.race_candidate`.
- **RF-007 — El modelo nunca inventa Day/Race.** Si el protest form no
  indica la fecha del incidente o el número de prueba, el backend
  omite el campo correspondiente (`day_candidate`/`race_candidate`
  vacíos) — nunca un valor inventado, mismo criterio que el resto de
  campos extraídos (`CLAUDE.md`, nunca se inserta nada sin acción
  explícita; prompt actual: "never guess or invent").
- **RF-008 — Day extraído es el del incidente, no el de presentación
  del formulario.** Si el protest form trae ambas fechas y difieren,
  `day_candidate` toma la fecha del día protestado/de la regata, no la
  de cuándo se rellenó o presentó el formulario.

## Decisiones técnicas

- Apartado "General" sin `CopyBox` — no es una de las ocho cajas fijas
  del documento (Parties, Witness, Procedural Matters, Facts Found,
  Conclusion, Rules Applicable, Decision, Jury Members); no tiene
  sentido un botón "Copy" para él.
- `useSuggestedDay`/`useSuggestedRace` son funciones nuevas,
  deliberadamente más simples que `useSuggestedParty` — `day`/`race`
  son `string` sueltos (`useState`), no objetos compuestos, así que
  cada una es un `setState` directo con un solo guard.
- `AttachmentExtraction` sigue sin paquete de tipos compartido entre
  `apps/api` y `apps/web` (ya era así antes de esta spec) — el par de
  campos nuevos se añade a mano en ambos sitios, como ya pasa con el
  resto del interface.

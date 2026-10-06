# SPEC-017 — Notas de audiencia

Estado: draft.

Relacionado: `CLAUDE.md` (Los dos mecanismos de sugerencia — este es
un tercer mecanismo, distinto de ambos: no es autocompletado en línea
ni panel de borrador alternativo, es una fuente más del panel de
sugerencias ya existente, igual que "protest form" hoy), `apps/api/src/ai/extract.ts`
(`extractFromAttachments` — pipeline de IA que esta spec replica para
una fuente de texto distinta: notas en vez de un adjunto subido;
mismo principio de fundamentación, nunca inventar), `apps/api/src/routes/extractAttachments.ts`
(`POST /cases/:id/extract-attachments` — mismo patrón de ruta
"Process" manual que esta spec replica), `apps/web/src/components/SuggestionsPanel.tsx`
(panel de sugerencias de las 4 cajas de redacción, donde aparece la
nueva fuente), `DECISIONS.md` D-029 regla 2 (uniformidad de fuentes de
sugerencia entre las 4 cajas de redacción — la nueva fuente "Hearing
notes" debe ofrecerse en las 4, no en unas sí y en otras no),
`SPEC-016-ux-form-tweaks.md` (varios initiators/varios respondents por
caso — el reconocimiento de barcos de esta spec debe tener en cuenta
que puede haber más de uno de cada rol).

## Intención

Durante la audiencia, el jurado toma notas a mano alzada, en taquigrafía
propia — números de vela abreviados, frases sueltas, lo que se dice en
el momento. Esta spec añade una caja de texto libre, "Hearing notes", siempre
visible (entre la barra de menú superior y la barra de pestañas del
caso, no dentro de ninguna pestaña concreta), donde escribir esas
notas tal cual. Un botón "Process" (disparado también automáticamente
al entrar en una de las 4 cajas de redacción, si las notas cambiaron
desde el último proceso) envía el texto a la IA, que:

1. Reconoce números de vela abreviados contra los barcos ya
   registrados en este caso (initiator(s)/respondent(s), SPEC-016) —
   p. ej. "004" se resuelve a "ITA 32004" si ese es el único barco del
   caso cuyo número termina en 004; si es ambiguo o no coincide con
   ningún barco del caso, se deja tal cual, nunca se inventa.
2. Traduce el texto a inglés (las notas pueden estar en cualquier
   idioma; el resto del documento siempre se escribe en inglés, mismo
   criterio que ya aplica `extractFromAttachments`).
3. Propone el resultado como una fuente de sugerencia nueva,
   "Hearing notes", en el panel de sugerencias de las 4 cajas de
   redacción (Procedural Matters, Facts Found, Conclusion, Decision) —
   el ejemplo del dueño ("después de la salida, ambos OCS arriba para
   volver, 929 se para proa al viento") es material de Facts Found,
   pero nada ata las notas a una caja fija: la IA decide, por nota,
   dónde encaja mejor, y puede repartir distinto material entre varias
   cajas.

Igual que `extractFromAttachments`, nada se inserta solo — el jurado
hace clic para llevar cada sugerencia a la caja que corresponda.

## Alcance

**Dentro:**
- Columna nueva `protest_case.notes TEXT NOT NULL DEFAULT ''` —
  segunda migración real de este proyecto (primera fue
  `with_case_note`, SPEC-016), mismo patrón `ALTER TABLE` guardado por
  `PRAGMA table_info`.
- Caja "Hearing notes" en `CaseForm.tsx`, entre `.case-header`/el mensaje de
  error y `.tab-bar-row` — visible en todas las pestañas, no es
  contenido de ninguna pestaña (misma categoría que la fila de
  Save/Download decision: estructura siempre visible alrededor de las
  pestañas, no sujeta a D-029 regla 1, que regula el contenido *de una
  pestaña*). Un `<textarea>` simple ligado a `notes`, sin
  autocompletado fantasma ni panel de sugerencias propio.
- `notes` viaja en el mismo `PATCH` del botón Save único
  (`handleSaveAll`, SPEC-014) — persiste igual que el resto de campos.
- Botón "Process" junto a la caja de notas: deshabilitado si las
  notas están vacías o si ya hay un proceso en curso.
- Disparo automático: al cambiar `caseTab` a una de
  `procedural`/`facts`/`conclusion`/`decision`, si `notes` no está
  vacío y cambió desde el último proceso (comparado contra lo último
  realmente enviado, no contra el último guardado — las notas no
  hace falta guardarlas para procesarlas), se dispara el mismo
  "Process" solo. No se repite si las notas no cambiaron, aunque se
  cambie de pestaña varias veces. **Al abrir un caso, el disparo
  automático arranca "desarmado"**: la referencia de "último
  procesado" se inicializa con el texto de notas ya guardado (el que
  carga `reload()`), no con una cadena vacía — así, abrir un caso con
  notas de una sesión anterior y cambiar de pestaña nunca gasta una
  llamada a IA por sí solo; solo se arma cuando el usuario edita el
  texto él mismo en esta sesión (decisión confirmada con el dueño).
  Un guardia síncrono (no solo el estado `notesProcessing`, que se
  actualiza de forma asíncrona) evita que dos cambios de pestaña
  rápidos disparen dos llamadas a IA solapadas.
- Backend: `extractFromNotes(caseId, notes)` en un fichero nuevo
  (`apps/api/src/ai/extractNotes.ts`), mismo pipeline que
  `extractFromAttachments` (Anthropic, `claude-sonnet-5`, JSON-only),
  pero con el texto de notas como entrada en vez de los adjuntos
  convertidos, y con la lista de barcos de este caso
  (initiator(s)/respondent(s), vía `party`/`boat`) incluida en el
  prompt como referencia para resolver números abreviados.
- Ruta nueva `POST /cases/:id/extract-notes`, cuerpo `{ notes: string
  }` (el texto actual de la caja, posiblemente sin guardar todavía —
  igual que el resto del formulario, lo que hay en pantalla es la
  fuente de verdad hasta que se pulse Save).
- `SuggestionsPanel.tsx` gana una fuente nueva "Hearing notes",
  mismo componente/patrón visual que "Protest form"
  (`CollapsibleSection`, líneas/párrafo clicables), ofrecida en las 4
  cajas de redacción por igual (D-029 regla 2).

**Fuera de esta spec:**
- Autocompletado en línea o resaltado dentro de la propia caja de
  notas — es un `<textarea>` plano, sin `GhostTextarea`.
- Analizar las notas en vivo mientras se escribe (debounce tipo ghost
  text) — descartado explícitamente por el dueño; solo manual + al
  cambiar de pestaña.
- Resolver números de vela contra toda la flota del sistema — solo
  contra los barcos ya registrados en este caso (decisión explícita
  del dueño).
- Que el texto de notas aparezca en el `.html` exportado o tenga botón
  Copy — es un borrador interno, nunca sale del formulario (decisión
  explícita del dueño).
- Sugerencias de día/carrera/partes/testigos/reglas citadas desde las
  notas — ese material sigue viniendo solo del protest form
  (`extractFromAttachments`); las notas solo alimentan las 4 cajas de
  redacción.
- Deshacer/historial de versiones de las notas.

## Requisitos funcionales

- **RF-001 — Caja Hearing notes siempre visible.** Un `<textarea>`
  "Hearing notes" aparece entre la barra de menú y la barra de
  pestañas del caso, en cualquier pestaña activa.
- **RF-002 — Persiste con el Save único.** El texto de notas se guarda
  en el mismo `PATCH` que el resto del formulario; sobrevive a
  recargar la página tras guardar.
- **RF-003 — Process manual.** Botón "Process" junto a la caja,
  deshabilitado si no hay texto o si ya hay un proceso en curso.
- **RF-004 — Process automático al entrar en una caja de redacción,
  solo tras editar en esta sesión.** Cambiar a Procedural Matters/
  Facts Found/Conclusion/Decision dispara el mismo proceso si las
  notas cambiaron, en esta sesión, desde la última vez que se
  procesaron; no se repite si no cambiaron. Abrir un caso con notas ya
  guardadas y cambiar de pestaña sin editar el texto nunca dispara una
  llamada de IA por sí solo — el disparo automático solo se arma
  cuando el usuario edita las notas él mismo.
- **RF-004b — Sin llamadas solapadas.** Cambiar de pestaña varias
  veces seguidas mientras un proceso sigue en curso no dispara una
  segunda llamada a la IA en paralelo.
- **RF-005 — Reconoce barcos del caso, nunca inventa.** Un número
  abreviado que coincide sin ambigüedad con un barco
  initiator/respondent de este caso se resuelve a su sail number
  completo (con prefijo de país); si no hay coincidencia clara, el
  texto original de la nota se mantiene tal cual, sin adivinar.
- **RF-006 — Traducido a inglés.** El material propuesto en cualquiera
  de las 4 cajas está en inglés, sea cual sea el idioma de la nota
  original.
- **RF-007 — Fuente "Hearing notes" en las 4 cajas de redacción, no
  solo en una.** El panel de sugerencias de Procedural Matters, Facts
  Found, Conclusion y Decision muestra esta fuente cuando hay
  contenido para esa caja — igual criterio de uniformidad que
  "Protest form" (D-029 regla 2).
- **RF-008 — Nada se inserta solo.** Cada línea/párrafo sugerido es
  click-to-insert; nunca se escribe en una caja sin esa acción
  explícita.
- **RF-009 — Las notas nunca salen del formulario.** No aparecen en el
  `.html` exportado, no tienen botón Copy.

## Nombre de la caja

La caja de esta spec se llama **"Hearing notes"**, no "Notes" a secas
— la pestaña "1. General" ya tiene un campo "With case(s) notes"
(SPEC-016, una línea sobre casos vinculados) visible en la misma
pantalla en otro momento; un nombre más específico evita confundir
ambos. El texto de la caja, la fuente de sugerencia en el panel
("Hearing notes") y el prop (`notesForm`) quedan consistentes con este
nombre.

## Decisiones técnicas

- Mismo pipeline de IA que `extractFromAttachments` (Anthropic,
  `claude-sonnet-5`, prompt + JSON-only, mismo manejo de fence/parseo)
  — no se inventa un mecanismo nuevo, se replica el ya probado con una
  fuente de entrada distinta.
- La caja de notas vive fuera de cualquier `caseTab === X`, igual que
  la fila de Save/Download — no es contenido de pestaña, así que D-029
  regla 1 (un solo modo de presentación *por pestaña*) no le aplica;
  se documenta aquí explícitamente para que no se lea como una
  violación al revisar la spec.
- El disparo automático compara contra el último texto realmente
  enviado a `extract-notes` (una ref local, no el valor guardado en
  servidor) — evita llamadas repetidas a la IA si el usuario solo
  cambia de pestaña sin tocar las notas.
- Resolución de barcos acotada a los de este caso: la lista de
  referencia que recibe el prompt sale de `party`/`boat` filtrado por
  `case_id`, ya tolerante a varios initiators/respondents (SPEC-016) —
  sin tocar la tabla `boat` completa.

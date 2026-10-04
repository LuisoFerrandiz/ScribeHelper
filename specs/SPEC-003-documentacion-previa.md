# SPEC-003 — Documentación previa (Protest Form(s))

Estado: **ya implementado y desplegado**. Esta spec documenta el
comportamiento existente — no describe trabajo pendiente, salvo donde
se marca explícitamente `[GAP]`.

Relacionado: `CLAUDE.md` (nota de estado 2026-10-04, que señalaba esta
funcionalidad como no documentada), `DECISIONS.md` D-027 (decisión
original: tabla `case_attachment`, pipeline propio, sin gate de
revisión), D-010 (no OCR).

## Intención

Primer tab dentro de un caso ("0. Protest Form(s)"), antes de "1.
General & Parties". Permite subir los documentos de origen del caso
(normalmente el/los formulario(s) de protesta) y, bajo demanda, extraer
de ellos candidatos de texto para las otras cajas del formulario — sin
escribir nada automáticamente.

## Alcance

**Dentro (ya construido):**
- Lista de adjuntos del caso: nombre de archivo + fecha de subida +
  aviso si la conversión a Markdown salió vacía.
- Subida de archivo: cualquier formato (`"cualquier formato"`, D-027),
  immediate al seleccionar el archivo, sin cola.
- Botón "Remove" por adjunto.
- Botón "Process": dispara la extracción IA sobre todos los adjuntos
  del caso a la vez.
- Botón de descarga del original por adjunto.

**Fuera (no construido, no parte de esta spec):**
- Auto-rellenar cualquier caja del caso sin acción del usuario.
- Fusionar todos los adjuntos en un único `.md` agregado por caso.
- Revisión/aceptar-rechazar de la conversión (D-027: deliberadamente
  sin ese gate, a diferencia de `rules/`).
- Indexación FTS de los adjuntos (D-027: fuera del pipeline de
  `resource`).

## Modelo de datos

Tabla `case_attachment` (`apps/api/db/schema.sql`), un registro por
archivo subido — **no uno agregado por caso**:

```
id, case_id, original_filename, original_path, markdown_path, conversion_empty, uploaded_at
```

Cada adjunto se convierte a Markdown en el momento de subirlo
(`apps/api/src/case-attachments/storage.ts` → `storeAttachment`,
reutiliza `convertToMarkdown` de `resources/convert.ts`, mismo soporte
PDF/.docx/.xlsx/.md, sin OCR). Si el tipo de archivo no es convertible
(p. ej. una foto), `markdown_path` queda `NULL` y el original se
conserva igual — la subida nunca falla por eso.

## Endpoints (`apps/api/src/routes/caseAttachments.ts`)

- `GET /cases/:caseId/attachments` — lista (`id`, `original_filename`,
  `conversion_empty`, `uploaded_at`).
- `POST /cases/:caseId/attachments` — multipart, un archivo por
  llamada.
- `GET /attachments/:id/file` — descarga el original.
- `DELETE /attachments/:id` — borra fila + archivos (original y `.md`
  si existe).

## Extracción (`apps/api/src/ai/extract.ts`)

`extractFromAttachments(caseId)`:

1. Lee todos los adjuntos del caso que sí tienen `markdown_path`
   (los no convertibles, como fotos, se ignoran en este paso — texto
   únicamente, sin visión, D-010).
2. Concatena su contenido y pide al modelo JSON con esta forma
   (`AttachmentExtraction`):
   - `parties.initiator` / `parties.respondent` — `sail_number`
     (siempre con prefijo de país), `boat_name`, `represented_by`.
   - `witnesses` — `full_name` + `role`.
   - `procedural_matters_candidate` — texto libre.
   - `facts_found_candidate` — texto libre (redactado como relato de
     parte, no como hecho probado).
   - `facts_found_candidates` — igual contenido, pero desglosado en
     hechos discretos, uno por entrada, en inglés.
   - `conclusion_candidate` / `decision_candidate` — casi siempre
     vacíos (un formulario de protesta se presenta antes de la
     audiencia).
   - `rule_citations_candidate`.
3. Nunca inventa: un campo no declarado en el formulario se omite, no
   se adivina. Reglas de nomenclatura explícitas en el prompt (p. ej.
   nombre de persona nunca es `boat_name`).

Es una llamada manual (botón "Process"), no automática al subir.

## Frontend — dónde aparecen las sugerencias

El resultado de "Process" **no se escribe en ninguna caja
automáticamente** — se ofrece como sugerencia con acción explícita del
usuario, en las pestañas donde cada campo vive:

- `parties.initiator`/`respondent` → pestaña "1. General & Parties",
  botón que llama `useSuggestedParty(role)` (`CaseForm.tsx:370-379`) —
  rellena sail number/boat name/represented by de golpe solo al
  pulsarlo.
- `witnesses` → mismo tab, `addSuggestedWitness()`
  (`CaseForm.tsx:381-383`) añade un testigo sugerido a la lista editable.
- `procedural_matters_candidate` → pestaña "3. Procedural Matters",
  mostrado como opción ("From protest form") junto a otras fuentes de
  sugerencia.
- `facts_found_candidates` → pestaña "4. Facts Found", lista de hechos
  discretos click-to-insert (`protestForm={{ lines: ... }}`,
  `CaseForm.tsx:803`).

`[GAP]` — `conclusion_candidate`, `decision_candidate` y
`rule_citations_candidate` existen en el tipo `AttachmentExtraction` y
los devuelve el backend, pero **no están conectados a ninguna UI**
todavía (no hay botón ni sugerencia visible para ellos en
`CaseForm.tsx`). `conclusion_candidate`/`decision_candidate` casi
nunca tendrán contenido real (un formulario de protesta se presenta
antes de la audiencia), impacto práctico bajo.

`[GAP]` — `rule_citations_candidate` es distinto y más serio: el
system prompt de `extract.ts` da instrucciones detalladas para
`parties`, `witnesses` y `facts_found_candidates` (formato de sail
number, quién es iniciador/respondido, un hecho por entrada, etc.) pero
**ninguna** para `rule_citations_candidate` — ni formato esperado
(`"RRS 44"` vs `"Rule 44"` vs número suelto), ni la regla de
`DECISIONS.md` D-004 ("nada se cita si no está en el corpus
validado"). Esta "cita" sale directo de lo que alega la parte en el
formulario, sin pasar por el corpus de `rules/` ni por FTS — no es una
cita verificada, es la regla que la parte *dice* que se rompió. Al no
estar conectado a ninguna UI hoy, el riesgo no se materializa, pero
cualquier spec futura que lo conecte debe decidir explícitamente cómo
se relaciona con D-004 antes de mostrarlo como si fuera una cita
válida.

## Seguridad y privacidad

- Sin gate de revisión (D-027, explícito): a diferencia de `rules/`,
  una mala conversión aquí no produce una cita incorrecta, solo una
  sugerencia pobre que el usuario revisa de todos modos antes de
  insertarla.
- `extractFromAttachments` exige `ANTHROPIC_API_KEY` configurada en el
  servidor — nunca en el navegador (`constitution.md` → Seguridad y
  datos).

## Decisiones técnicas

Todas ya tomadas y registradas en `DECISIONS.md` D-027 — no se repiten
aquí; esta spec documenta su implementación final, no las alternativas
consideradas.

## Explícitamente fuera de esta spec

- Cambiar qué campos se extraen o cómo se presentan las sugerencias —
  sería una spec nueva, no una revisión de esta.
- Resolver el `[GAP]` de `conclusion_candidate`/`decision_candidate`/
  `rule_citations_candidate` — solo señalado, no resuelto aquí.
- Revisión/aceptar-rechazar de la conversión — explícitamente fuera
  desde D-027.

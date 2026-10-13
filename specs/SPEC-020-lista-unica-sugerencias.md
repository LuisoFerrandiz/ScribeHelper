# SPEC-020 — Lista única de sugerencias en las cuatro cajas de redacción

Estado: draft v2. Las 4 preguntas abiertas están resueltas por el dueño
(2026-10-13). Revisada por el subagente `reviewer` (19 hallazgos); el
dueño aceptó las 4 propuestas de diseño y las correcciones se incorporan
aquí. Pendiente: plan y tasks.

Origen: fase F2 del replanteo de `issue.md` (sección "Replanteo",
2026-10-13). Sustituye la presentación por secciones de origen
(SPEC-001/005/017) y matiza D-029 (ver "Decisiones técnicas"), sin tocar
su regla 2.

Relacionado: `DECISIONS.md` D-029 (coherencia interna: fuentes
uniformes), D-004 (nada se cita fuera del corpus), D-022 (librería de
frases), D-024 (panel de borrador IA), SPEC-005/006/007/008
(fuentes por caja), SPEC-012 (fuente "protest form" en Decision),
SPEC-017 (fuente "hearing notes").
`apps/web/src/components/SuggestionsPanel.tsx`, `PhrasePicker.tsx`,
`ExamplePhraseSuggestions.tsx`, `AIDraftPanel.tsx`, `CaseForm.tsx`
(cuatro montajes de `SuggestionsPanel`, ~l.898, 942, 975, 1071),
`apps/api/src/routes/phrases.ts`, `apps/web/src/styles.css`
(`.suggestions-*`).

Idioma: la especificación está en español, pero **todo texto visible del
producto va en inglés** (`constitution.md`). Los textos de botones y
mensajes de abajo son los literales finales.

## Intención

El dueño explicó que, en Procedural Matters, Facts Found y Conclusion,
**al juez no le importa de dónde viene una sugerencia** (formulario,
hearing notes, frase, ejemplos o IA). Le importa **poder pasarla al
cuadro principal fácilmente**.

Hoy el panel lateral hace lo contrario: reparte las sugerencias en
secciones por origen, plegadas por defecto (`Protest form`, `Hearing
notes`, `Phrases`, `AI suggestions`), con botones que se comportan de
forma distinta según la sección:

- Formulario y notas: botón `+ <línea>`, pero el párrafo candidato
  muestra solo su etiqueta ("From protest form"), no su texto.
- Frases: botón con la etiqueta, o los 40 primeros caracteres, y "(own)"
  en las propias.
- IA desde ejemplos: botón `+ <texto completo>`.

El juez tiene que abrir cada sección para saber qué hay y no puede ver de
un vistazo qué insertaría. Esta spec sustituye eso por **una sola lista**
con botones uniformes que muestran el texto que se va a insertar. El
comportamiento de inserción y las fuentes no cambian.

## Alcance

**Dentro:**

1. **Un solo componente de lista** por caja, que reúne las mismas fuentes
   de hoy, sin secciones por origen y **sin plegado**: la lista está
   siempre visible.
2. **Botón uniforme**: cada elemento muestra su texto (recortado si es
   largo, con el texto completo en el tooltip) y un clic lo inserta, igual
   que hoy (añadir al final del cuadro, separado por una línea en blanco).
3. **El origen deja de verse** (sin sección, sin etiqueta, sin "(own)").
   Se conserva como dato interno por elemento, para F4/F5.
4. **Ejemplos bajo demanda** con botón explícito (RF-005).
5. **Frases accesibles de dos maneras**: búsqueda y botón "Browse
   phrases" que lista todas las de la caja (RF-007).
6. **Corrección de `GET /phrases/search`**: el filtro por caja pasa a
   aplicarse antes del `LIMIT` (RF-012). Único cambio de backend.
7. **Retirada de la rama muerta** `AIDraftPanel` dentro de
   `SuggestionsPanel` y de la prop `caseId`, que solo servía a esa rama.
   `AIDraftPanel.tsx` y la ruta del backend **se conservan sin montar**
   hasta F4/F6 (código sin uso en la UI hasta entonces, declarado).
8. **Retirada del CSS y comentarios obsoletos**: `.suggestions-section-
   toggle/chevron/body` (styles.css ~l.759-778) y los comentarios que
   describen las secciones plegables.
9. **Entrada nueva en `DECISIONS.md`** (D-030, libre) que sustituye la
   presentación por secciones.

**Fuera de esta spec:**
- Inserción en la posición del cursor (fase F3).
- Frases con huecos y relleno (F3), IA que complementa las frases (F4),
  reglas sugeridas desde los hechos (F5) y coherencia entre cajas (F6).
- Cambios en el comportamiento de `PartyReference` (solo lectura, fuera
  de las sugerencias, como dice D-029); solo cambia dónde se monta.
- Cambios en esquema o en cómo se extraen formulario y notas.
- `conclusion_candidate` / `decision_candidate` (ISS-007, aplazado): siguen
  alimentando las mismas listas.
- Rules Applicable y todo lo relativo a citas (fase F1; SPEC-019
  reemplazada).

## Requisitos funcionales

- **RF-001 — Una lista por caja.** Cada una de las cuatro cajas
  (Procedural Matters, Facts Found, Conclusion, Decision) muestra una sola
  lista de sugerencias, siempre visible, sin secciones por origen ni
  plegado.
- **RF-002 — Mismas fuentes disponibles que hoy.** Siguen disponibles
  líneas y párrafo del formulario de protesta, líneas y párrafo de las
  hearing notes, frases de la librería para esa caja y sugerencias desde
  ejemplos. "Disponible" no significa "listado por defecto" (ver RF-006).
  Ninguna fuente se pierde ni se añade. Se cumple D-029 regla 2: la misma
  clase de fuente está disponible, aunque vacía, en las cuatro cajas.
- **RF-003 — Botón uniforme con texto recortado.** Cada elemento es un
  botón que muestra el texto que se insertará (el párrafo candidato ya no
  se oculta tras su etiqueta; en las frases se muestra el cuerpo, no la
  etiqueta, que pasa al tooltip junto al texto completo). Los textos
  largos se recortan a **3 líneas** con CSS (`line-clamp`). El texto
  completo va en el atributo `title`. Lo que se inserta es siempre el
  texto completo. Un clic inserta. Nota: `title` no existe en táctil; el
  recorte a 3 líneas mantiene visible lo esencial, y en el futuro puede
  añadirse expandir al pulsar (no bloquea).
- **RF-004 — Inserción sin cambios.** Insertar sigue añadiendo al final del
  cuadro, con una línea en blanco de separación, y no inserta nada sin un
  clic (límite no negociable de `constitution.md`).
- **RF-005 — Ejemplos bajo demanda.** Las sugerencias desde ejemplos
  (`suggestPhrasesFromExamples`) cuestan una llamada al modelo. Hoy se
  piden al expandir la sección; pasan a pedirse con el botón explícito
  **"Suggest from examples"**.
  - La caché vive en un hook propio (`useExampleSuggestions`) con caché a
    nivel de módulo, **por caja y no por caso** (la petición solo depende
    de la caja: `suggestPhrasesFromExamples(box)`). Sobrevive al cambio
    de pestaña (las cajas se montan y desmontan con la pestaña) y dura
    hasta recargar la página. Un botón "Refresh" vuelve a pedirlas. Así
    `CaseForm` no gana líneas.
  - Estados: mientras carga, el botón queda desactivado (guarda contra
    doble clic) y muestra "Suggesting…"; si falla, mensaje de error corto
    y el error no se cachea; si no hay ejemplos aceptados o la respuesta
    es vacía, mensaje "No usable suggestions from examples." No se
    inventa nada.
  - Si el usuario cambia de caja mientras carga, la respuesta se guarda en
    la caché de la caja que la pidió y no se pinta en otra.
- **RF-006 — Orden y contenido por defecto.** Por defecto la lista
  muestra **solo lo derivado del caso**, en este orden: 1) formulario de
  protesta (incluye en Procedural Matters las líneas generadas del propio
  caso, `autoProceduralLines`, y después el párrafo; líneas primero, como
  hoy), 2) hearing notes (líneas, luego párrafo). Las frases y los
  ejemplos **no se listan por defecto**. Al buscar o pulsar "Browse
  phrases" aparecen las frases tras lo del caso; los ejemplos, al final.
  Mismo orden en las cuatro cajas. Se descartan elementos vacíos o solo
  espacios.
- **RF-007 — Búsqueda y exploración.** Un campo de búsqueda ("Search
  suggestions…") y un botón "Browse phrases".
  - Con texto: filtra en el cliente lo del caso y los ejemplos ya
    cargados (subcadena, sin distinguir mayúsculas), y añade las frases
    de esa caja con `GET /phrases/search` (debounce 300 ms como hoy; la
    respuesta de una consulta superada se descarta).
  - "Browse phrases" lista todas las frases de la caja (el `GET` de
    listado existente), sin texto de búsqueda. Con el campo vacío y sin
    pulsarlo, las frases no se muestran.
- **RF-008 — Vacío explícito.** Si no hay ninguna sugerencia del caso, la
  lista muestra: "No suggestions from this case yet. Search or browse
  phrases, or suggest from examples." Si una búsqueda no devuelve frases
  ni elementos del caso: "No matches." Nunca se rellena con algo
  plausible. El mensaje "No phrases for this box yet." solo aparece si la
  caja realmente no tiene frases (consulta de listado vacía), no tras una
  búsqueda sin coincidencias.
- **RF-009 — Guardar como frase conserva su comportamiento.** El pie de la
  lista mantiene "Save current text as phrase" y su campo de etiqueta
  opcional. Tras guardar, se vacía el campo de etiqueta y, si "Browse
  phrases" está activo, el listado se refresca; no cambia la búsqueda en
  curso.
- **RF-010 — Datos y red.** Sin cambios en rutas salvo RF-012, ni en los
  tipos `AttachmentExtraction`/`NotesExtraction`, ni en cómo `CaseForm.tsx`
  produce `protestForm` y `notesForm`. La lista debe reaccionar si
  `notesExtraction` o `extraction` cambian con la lista abierta, y no
  rompe mientras alguno de los dos aún carga (lista vacía sin error).
- **RF-011 — Una frase nunca se presenta como regla.** Ningún elemento de
  la lista se rotula como cita o regla. Se retira el "(own)" de las
  frases propias: sin marca de origen, una frase propia y una línea del
  formulario se ven iguales, por decisión del dueño. Frases base y propias
  con el mismo texto no se deduplican (son filas distintas de la
  librería).
- **RF-012 — Búsqueda de frases por caja correcta.** `GET /phrases/search`
  aplica el filtro de caja en la consulta SQL **antes** de `LIMIT 25`
  (hoy después, `phrases.ts` ~l.30-39), de modo que hits de otras cajas no
  desplazan resultados ni producen un falso vacío.
- **RF-013 — PartyReference fuera de la lista.** `PartyReference` (hoy
  montado dentro de `SuggestionsPanel`) se monta en `CaseForm` junto a la
  lista, en Facts Found y Decision, con las mismas props de hoy
  (`partyReference`, `race` en Decision). No pasa a ser un elemento de la
  lista.

## Decisiones técnicas propuestas

- **Un componente nuevo** `SuggestionList` que recibe elementos
  `{ id, text, source }` ya normalizados y las acciones `onInsert`. Fetch
  propio solo para frases (búsqueda y listado); la petición de ejemplos
  la dispara el botón y su estado/caché viven en el hook
  `useExampleSuggestions` (RF-005).
- **La normalización a `{id,text,source}` vive en un helper** (nombre
  sugerido `suggestionItems` junto a `format.ts`, D-028), no en
  `CaseForm.tsx`, para reducir líneas de ese fichero (ISS-006). `id` =
  `${source}:${índice}` para elementos del caso; `phrase:${id}` para
  frases. Duplicados de texto entre formulario y notas se mantienen
  (orígenes distintos).
- **`source` se mantiene como dato interno**, no como presentación; sirve
  a F4/F5. La regla "una frase no se presenta como regla" se cumple al no
  rotular nada como regla, no por guardar `source`.
- **`SuggestionsPanel` se sustituye** por el nuevo componente; se retiran
  la rama `AIDraftPanel`, la prop `caseId`, y los comentarios y CSS
  obsoletos.
- **Entrada nueva en `DECISIONS.md`** (D-030): la presentación pasa de
  "secciones por origen" a "lista única uniforme". D-029 no describe las
  secciones, solo exige uniformidad de fuentes, así que **no se modifica**
  (append-only); D-030 deja constancia de que sustituye el diseño de
  secciones de SPEC-001/005/017. `constitution.md` **no se toca**: sus
  reglas de sugerencias nombran fuentes que siguen existiendo; lo que
  desaparece es solo su presentación en secciones. Lo anota D-030.

## Decisiones del dueño

1. **Orden:** primero formulario, luego notas; después frases y ejemplos
   (RF-006). Igual en las cuatro cajas.
2. **Marca de origen:** ninguna, tampoco "(own)" (RF-011).
3. **Qué se lista:** solo lo del caso por defecto. Frases (búsqueda o
   "Browse phrases") y ejemplos (botón) bajo demanda (RF-006/007).
4. **Texto largo:** recortado en la lista (RF-003).
5. **Revisión (2026-10-13):** frases con botón "Browse phrases" y arreglo
   del `LIMIT`; cuerpo de la frase en el botón, etiqueta en el tooltip;
   lista siempre visible, sin plegado.

## Riesgos

- **Menos visibilidad de las frases:** un juez que las usa a diario
  necesita una pulsación más ("Browse phrases"). Aceptado; se revisa en
  uso real.
- **Un cambio de backend** (RF-012) en una spec de presentación. Es una
  corrección acotada (mover el filtro a la SQL); se verifica con
  `npm run build` y en vivo.
- **Regresión silenciosa:** no hay suite de tests; el componente toca las
  cuatro cajas. Mitigación: verificación en vivo caja por caja.
- **`title` no existe en táctil:** el texto completo no se ve antes de
  insertar en tablet; mitigado por el recorte a 3 líneas.
- **`CaseForm.tsx` ya es grande** (ISS-006): esta spec debe reducir líneas
  de ese fichero, no aumentarlas. SPEC-019 está reemplazada, sin solape.

## Verificación

1. `npm run typecheck` en `apps/web` y `npm run build` en `apps/api`
   limpios.
2. Verificación en vivo en `http://192.168.1.105:8086/`, en cada una de las
   cuatro cajas:
   - la lista está siempre visible y muestra por defecto solo formulario y
     notas, en ese orden, con el texto recortado a 3 líneas y el completo
     en el tooltip;
   - no aparece "(own)" ni etiqueta de origen;
   - al buscar aparecen las frases de esa caja; "Browse phrases" las lista
     todas; con el campo vacío no se muestran;
   - una búsqueda cuyo término está en frases de otra caja no oculta las
     de esta (RF-012);
   - lo que se inserta es el texto completo, no el recortado;
   - un clic inserta al final con línea en blanco, sin insertar nada solo;
   - "Suggest from examples" no se dispara hasta pulsarlo; el doble clic no
     duplica la llamada; cambiar de pestaña y volver conserva el
     resultado; "Refresh" lo repite;
   - error de IA (sin clave) y ejemplos vacíos muestran su mensaje;
   - lista vacía muestra el mensaje con la pista; búsqueda sin
     coincidencias muestra "No matches.";
   - "Save current text as phrase" sigue funcionando;
   - `PartyReference` sigue visible en Facts Found y Decision;
   - la lista reacciona al terminar "Process" de formulario o notas;
   - Parties y Rules Applicable no cambian.
3. Tras "Pull and redeploy" en Portainer, reconfirmar lo anterior en
   producción (definición de terminado de `CLAUDE.md`).

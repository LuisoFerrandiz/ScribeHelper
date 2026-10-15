# SPEC-034 — Propuestas vivas encima del cuadro de redacción

Estado: **IMPLEMENTADA, desplegada y verificada en vivo (2026-10-15)**, ver D-046 y
`SPEC-034-tasks.md`. **Desviaciones respecto a esta v4, decididas con el dueño al probar:**
(1) RF-007: el motor **no** recibe como fuente `NotesExtraction` ni otros candidatos; esa
extracción (botón "Process", ruta `extract-notes`) se eliminó. (2) RF-010 se ampliaron:
validación frase por frase, anclaje de palabras a las fuentes, atribución obligatoria de lo que
solo sostiene el formulario, sin vínculo número de vela + posición ni par rol + posición no
escritos por el escribano, sin reformular la caja ni presentar como hecho lo que las notas
atribuyen a alguien, ≥ 6 palabras. (3) En Decision no se ofrecen frases con vocabulario de
resultado y en Conclusion/Decision se exigen 3 palabras compartidas. (4) RF-005: `More` es un
menú desplegable con un único scroll; las tarjetas se apilan a todo el ancho (no en cuadrícula).
(5) El texto insertado en medio de una palabra añade un espacio. Texto original: draft v4,
sustituye a v1-v3. v4 incorpora la segunda revisión del
`reviewer` (4 bloqueos, 11 importantes, 7 menores) y 4 decisiones del dueño. Pendiente de
aprobación antes de plan y tareas.

Origen: el dueño describe "desorden y caos" a la derecha del cuadro principal en Procedural
Matters, Facts Found, Conclusion, Rules Applicable y Decision, y que casi todas las
sugerencias se cortan. Plan: `C:\Users\luiso\.claude\plans\mi-problema-ahora-mismo-logical-acorn.md`.

Relacionado (sustituye, en parte): D-030 y SPEC-020 (RF-003 recorte, RF-005/006/007 lista,
ejemplos y orden), SPEC-023 y SPEC-024 (layout en columna), D-044/SPEC-032 (etiqueta "Party
claim — not final" y posturas de parte como tarjeta), D-042/SPEC-031 (relleno de huecos:
aquí con verificación servidora sin aceptar valor a valor; el panel actual se mantiene),
SPEC-017/018 (candidatos de hearing notes), SPEC-025/026 (frases/huecos/avisos),
SPEC-027/028/029 (Rules, avisos), D-041/SPEC-030 (cadena), D-036, D-004, D-032,
`constitution.md` (offline primero, determinista antes que IA, sin reemplazo silencioso, "la
herramienta no decide", toda afirmación de regla con fuente). D-046 registrará qué se
sustituye y por qué se rompen D-042 y D-044 en esos puntos.

## Premisas verificadas

- Editor: `<textarea>` con espejo (`GhostTextarea.tsx:326-346`), no CodeMirror.
- `insertAtCaret` hoy sustituye la selección (`GhostTextarea.tsx:164-176`).
- Fantasma: Haiku 4.5, debounce 900 ms, `requestId`, sin `AbortController`.
- `fillGaps` usa Sonnet 5 (`fillGaps.ts:206`); `extractNotes`, Sonnet.
- Frases: el cliente ya las carga por caja una vez (`usePhraseCompletions.ts`); `GET
  /phrases/search` pasa el texto crudo a `MATCH` y puede lanzar con signos (`phrases.ts:34-39`).
- Hearing notes (`protest_case.notes`) llegan en el cuerpo de la petición.
- Cada pestaña monta y desmonta su caja (`CaseForm.tsx:633-808`).

## Intención

La columna derecha mezcla 10-20 controles en 280 px y recorta el texto. Flujo que quiere el
dueño: el juez escribe o toma las hearing notes; el sistema coge las frases hechas, rellena
los huecos y plantea **2-3 frases** que un clic inserta en el cursor; si no gustan, el juez
escribe y las propuestas **se renuevan solas** con lo escrito, las hearing notes y las frases
ya usadas. Una vez asumida una propuesta por el comité, su origen da igual: **sin etiquetas,
títulos ni indicador de origen**. Pantalla objetivo: portátil o monitor ancho.

## Decisiones del dueño (2026-10-15)

1. Redacción nueva de la IA **solo en Procedural y Facts**; en Conclusion y Decision las
   propuestas son solo **frases guardadas** con huecos de datos verificados.
2. Huecos en la tarjeta: **solo con datos verificados**; si no, queda el `[hueco]`.
3. Las sugerencias del caso (formulario de protesta, hearing notes, posturas de parte)
   **entran como entrada del motor y salen del cuadro**; las posturas de parte no se ofrecen
   como texto insertable.
4. Las frases guardadas se muestran **al instante** (en el navegador, sin red); la IA las
   mejora después.
5. Refresco automático al dejar de teclear; fantasma sin cambios; secundario en menú More;
   Save as phrase guarda la selección (o la caja entera); insertar nunca reemplaza; sin estado
   entre pestañas.

## Alcance

**Dentro:** endpoint `POST /cases/:id/proposals`; `ai/proposals.ts`; `ProposalsStrip` y
`useProposals`; menú More; inserción sin reemplazo; editor a ancho completo; Rules Applicable
con bandeja simple y hook de referencias; D-046 y notas de superación.

**Fuera:** fantasma (Tab), `AIDraftPanel`, esquema y tablas, propuestas en Rules Applicable
(D-004), persistencia de propuestas entre pestañas o recargas, `GapFillPanel` (se mantiene).

## Requisitos funcionales

### Franja y tarjetas
- **RF-001 — Franja.** Cada caja de frases (Procedural, Facts, Conclusion, Decision) muestra
  entre la cabecera y el editor una franja con **hasta 3 tarjetas** en cuadrícula a ancho
  completo. La tarjeta es un botón con el texto **completo**, sin recorte, sin etiqueta, título
  ni tag (desaparece "Party claim — not final"). La franja **reserva una fila de altura**
  mientras está montada, para que el editor no salte al llegar o irse las tarjetas. Las claves
  de tarjeta son estables (hash del texto).
- **RF-002 — Insertar en el cursor.** Un clic llama a `insertAtCaret` y abre la sesión de
  huecos si el texto lleva `[huecos]` o X/Y. **Nunca reemplaza**: con selección activa inserta
  en `selectionEnd`. Si `selectionEnd` es el final del texto o la caja no se ha tocado, se
  añade tras `\n\n`, como hoy. Una sesión de huecos abierta se sustituye por la nueva, como hoy.
  Botones con `onMouseDown preventDefault` y `data-gap-ui`. **Mientras el puntero está sobre la
  franja o hay un `mousedown` pendiente, la franja no cambia sus tarjetas** (se aplica la
  respuesta pendiente al salir).
- **RF-003 — Ya insertada, no se repite.** Una propuesta cuyo texto normalizado
  (`normalizePhraseText`) ya está en la caja no se ofrece. Una frase con huecos ya rellenados se
  compara por texto del cuerpo con los huecos como comodín.

### Motor: capa determinista inmediata (navegador)
- **RF-004 — Frases al instante.** El cliente ordena las frases de la caja (ya cargadas, una
  vez) por solapamiento de palabras de contenido con el texto actual y las hearing notes
  (inglés, palabras vacías fuera, ≥3 letras), y muestra de inmediato hasta 3. Desempate:
  propias antes que base, luego `id` ascendente. **Sin texto ni notas no se muestran frases**
  (no se propone un resultado concreto por orden de `id`). Funciona sin red ni IA.
- **RF-005 — Líneas del caso.** En Procedural las líneas automáticas del caso
  (`autoProceduralLines`) se ofrecen también como tarjetas deterministas dentro de las 3.

### Motor: capa IA (servidor)
- **RF-006 — Endpoint.** `POST /cases/:id/proposals` recibe `{box, text, notes, context,
  candidate_ids}` (hasta 6 ids de frases de la caja, elegidos por el cliente en RF-004). Devuelve
  404 si el caso no existe y 400 si la caja no es una de las cuatro. Si no hay `ANTHROPIC_API_KEY`
  responde con `{proposals: [], ai: 'unavailable'}` sin lanzar ni registrar error por pausa.
- **RF-007 — Fuentes y topes.** El prompt delimita todo como **datos de solo lectura**, con
  marcadores propios eliminados del texto de entrada (notas, texto, cadena, cuerpos de frases,
  formulario). Entradas con tope: texto (últimos 1500 caracteres), notas 6000, cadena
  (`chainContextFor`, 1500 por caja), formulario de protesta 8000 (`buildSources`), cada frase
  candidata 600. Las extracciones de formulario y de hearing notes (`NotesExtraction`) ya hechas
  por el cliente viajan como una fuente más (`notes_extraction`) y **no se vuelve a extraer**.
  **La postura de la parte (`party_position`) nunca es fuente.**
- **RF-008 — Contrato del modelo.** Salida JSON:
  `{proposals:[{kind:'phrase'|'new', phrase_id?, text?, fills:[{gap, value, source, quote}]}]}`.
  `max_tokens` 1200; si `stop_reason` es `max_tokens` o el JSON no parsea, se usa el fallback de
  RF-011. Modelo inicial Haiku 4.5; pasa a Sonnet 5 si la calidad no basta (pregunta abierta 1).
  Se extrae `parseJson` a un helper compartido (hoy copiado en `fillGaps.ts` y `extractNotes.ts`).
- **RF-009 — Huecos verificados.** Para `kind:'phrase'` el servidor lee el cuerpo de la frase
  de la base de datos (nunca del modelo), localiza sus huecos de datos (`isDataGapText`), valida
  cada `fill` con `validateFills` y **construye el texto sustituyendo solo los huecos validados**
  en el cuerpo original. Un hueco sin valor verificado queda como `[hueco]`. Alternativas
  `[a] [b]` y `X`/`Y` **no se resuelven nunca** (D-036). El resto del cuerpo no se altera. El
  parser de huecos del servidor se alinea con `web/src/phraseGaps.ts` (mantenidos a mano).
- **RF-010 — Redacción nueva (`kind:'new'`).** Solo en Procedural y Facts; en Conclusion y
  Decision se descarta. El prompt ordena atribuir lo que sea una afirmación de una persona
  ("The witness states that…") y basarse solo en las fuentes. El servidor descarta la propuesta
  si: contiene un token con dígitos (número, hora, fecha, número de vela) que no aparece en las
  fuentes o en el texto; contiene una referencia de regla (D-004); contiene vocabulario de
  resultado (`upheld`, `dismissed`, `disqualif*`, `DSQ`, `redress`, `protest is`, …); supera 400
  caracteres; o es charla del modelo (`CHATTER`). **Riesgo residual declarado:** un hecho
  plausible sin dígitos que no esté en las fuentes no se detecta; cada inserción es un clic
  explícito del juez y el texto queda editable.
- **RF-011 — Fallo y degradación.** Ante fallo de red, de IA o JSON inválido, la franja
  conserva las frases deterministas de RF-004/RF-005 y muestra una nota gris discreta "AI
  proposals unavailable" (el juez distingue "no hay propuestas" de "IA caída"). Nunca un error
  modal. Los fallos de IA se registran una vez, sin repetir en cada pausa.
- **RF-012 — Reglas en las propuestas.** Frases de la librería tomadas tal cual no se filtran
  (es redacción propia del juez). Todo texto producido por IA (huecos rellenados y `kind:'new'`)
  pasa por `citesDisallowedRule` en las cuatro cajas, con el conjunto permitido sin truncar a 1500
  caracteres para la comprobación (se compara contra el texto completo de las cajas).

### Renovación
- **RF-013 — Cuándo se pide.** `useProposals(caseId, box, text, notes, chain, phrases)` pide a la
  IA solo si hay texto o notas, ≈ 1500 ms después de dejar de teclear, si texto o notas cambiaron
  desde la última petición. Pide también al montar la caja si hay texto o notas. Una sola
  petición en vuelo; si el texto cambia mientras tanto, se marca "sucio" y se relanza **una vez**
  al terminar (con el debounce). `requestId` descarta respuestas de texto superado; el servidor
  no cancela la llamada en curso (limitación declarada, como el fantasma).
- **RF-014 — Cadena.** Un cambio en una caja anterior de la cadena no relanza la petición (como
  D-041); un botón pequeño "Refresh" en la franja la fuerza.
- **RF-015 — Coste.** Una llamada por pausa y caja, sin solapamiento, con los topes de RF-007.
  Criterios medibles en la verificación: tokens de entrada y salida por llamada, y tasa de
  propuestas descartadas por validación, anotados en las pruebas en TEST-02.

### Menú More
- **RF-016 — Menú.** Botón "More" junto a la franja con: buscador de frases ("Search
  suggestions…"), "Browse phrases", "Suggest from examples"/"Refresh examples" y "Save as
  phrase" con "Label (optional)". Resultados como tarjetas completas que insertan con RF-002.
  Se reutilizan los hooks y la lógica de `SuggestionList.tsx`. El buscador sanea el texto
  antes de llamar y `GET /phrases/search` captura el error de FTS y devuelve `[]` (**corrección
  mínima declarada** del endpoint existente). Se mantienen los textos vacíos y de error actuales.
- **RF-017 — Cierre y foco.** El menú se cierra con Escape (capturado a nivel de documento,
  con prioridad sobre el fantasma y la sesión de huecos; devuelve el foco al botón), clic fuera
  y Tab saliendo del menú. Tras insertar una tarjeta desde el menú, el menú se cierra y el foco
  vuelve al textarea. `aria-expanded` en el botón.
- **RF-018 — Save as phrase.** Guarda la selección del textarea si no está vacía (ni solo
  espacios); si no, el texto entero. El menú muestra "Selection" o "Whole box" y se actualiza al
  abrirlo. El cuerpo se guarda tal cual. Lectura de selección nueva en `GhostTextareaHandle`.
  No existe en Rules Applicable.
- **RF-019 — Sesión de huecos.** Inputs del menú con `data-gap-ui` y sin `preventDefault`:
  teclear conserva la sesión (hoy buscar la cierra). La sesión se cierra, como hoy, al pulsar
  dentro del textarea o al pulsar Escape.

### Layout y Rules
- **RF-020 — Editor a ancho completo.** Se retiran `.box-body-split`, `.textarea-col`,
  `.suggestions-col`, `.suggestions-panel`, `.suggestion-actions` y el `@media` de la columna, y
  el `line-clamp` de `.suggestion-item`. `.suggestion-row` y las reglas necesarias para
  `RulesSuggestions` **se conservan**. `PartyBar`, `GapFillPanel`, la pista de huecos y
  `PartyReference` (una fila por parte, resaltado intacto) pasan al pie del editor o a la franja
  sin cambiar comportamiento.
- **RF-021 — Rules Applicable.** Sin propuestas ni More. Bandeja simple encima del editor: citas
  registradas (insertan; Remove), alta por cita, "Suggest from Facts Found", buscador del corpus
  con `RuleHitList` (conserva `doc_title` y snippet). La consulta de referencias tecleadas
  (debounce 500 ms, cancelación de respuestas viejas, solo en la pestaña Rules) y los avisos
  ("N cited rules not in the text [Insert missing]", "Not found in the loaded rules: …") suben
  a un hook en `CaseForm` y se muestran bajo la cabecera.
- **RF-022 — Texto en inglés.** Textos nuevos en inglés: "More", "Save as phrase", "Selection",
  "Whole box", "Refresh", "AI proposals unavailable". Los existentes se conservan.

## Requisitos no funcionales
- Sin suite de tests: `npm run build` (api), `npm run typecheck` (web), script local con copia
  de la DB en el scratchpad (nunca `data/db`) y verificación en vivo en TEST-02 sin Save.
- Casos del script local (lógica pura de `ai/proposals.ts`): JSON truncado, sin clave, inyección
  en notas y en cuerpo de frase, hueco con cita falsa, `kind:'new'` con número inventado, con
  regla, con vocabulario de resultado, `kind:'new'` en Conclusion, frase con `[a] [b]` y X/Y,
  candidatas vacías, duplicado por normalización.
- Casos en vivo: caja y notas vacías, red caída hacia el servidor, sesión de huecos abierta
  cuando llega una respuesta, clic durante un refresco, Rules Applicable sin regresiones,
  escritorio ancho en las cinco cajas.

## Preguntas abiertas
1. ¿Basta Haiku 4.5 para huecos y redacción? Se decide con salidas reales en TEST-02.
2. Alto de la franja con tarjetas largas: se confirma con el piloto en Facts.

## Pasos propuestos (un commit cada uno, solo con orden del dueño)
1. Endpoint `proposals`, helper `parseJson`, corrección de `/phrases/search` y script local (sin UI).
2. `insertAtCaret` sin reemplazo + `ProposalsStrip` y `useProposals` en Facts (piloto), con la
   columna aún presente.
3. Resto de cajas de frases, menú More y Save as phrase; retirada de la columna.
4. Rules Applicable: bandeja simple y hook de referencias.
5. Limpieza CSS, `D-046`, notas de superación en SPEC-017/020/023/024/031/032 y `CLAUDE.md`.

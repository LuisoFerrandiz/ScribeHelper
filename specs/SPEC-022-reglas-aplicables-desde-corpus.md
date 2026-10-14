# SPEC-022 — Rules Applicable: citar eligiendo una regla del corpus

Estado: draft v3. Fase F1 del replanteo de `issue.md` (ISS-002). Opción
A elegida por el dueño (2026-10-14): índice por regla. v3 incorpora la
segunda revisión del `reviewer` (6 bloqueos, 8 importantes), que
ejecutó el parser sobre los cuatro `.md` reales; el dueño confirmó citar
con la parte (2026-10-14). Pendiente de plan/tasks actualizados y de
implementación. Sustituye a `SPEC-019` (reemplazada).

Depende de `SPEC-023` (caja de texto; D-032). Relacionado: `DECISIONS.md` D-004 (nada se cita fuera del corpus
validado), D-009 (flujo subir → revisar → aceptar), D-011/D-020 (índice
FTS de reglas por documento, solo aceptadas), D-023 (gotcha FTS5
UNINDEXED), D-024 (panel de borrador IA), `constitution.md`, SPEC-021
(pestaña Rules Applicable). `apps/api/db/schema.sql`,
`apps/api/src/db/migrate.ts`, `routes/resources.ts`, `routes/crud.ts`,
`routes/index.ts`, `ai/draft.ts`, `resources/convert.ts`,
`apps/web/src/components/CaseForm.tsx`, `ResourceUpload.tsx`,
`format.ts`.

## Intención

Hoy una cita nace de texto libre y el buscador indexa **documentos
enteros** (un resultado es "RRS Parts + fragmento", sin número de regla
ni botón). El juez reescribe la cita a mano y nada la comprueba.

El dueño quiere que **la cita nazca de elegir una regla del corpus**,
siempre con el mismo formato (`RRS 44.2`, `NoR 1.9`, `SI 12`, `CR …`) y
sin poder citar algo que no esté en las reglas subidas (D-004). Esta
spec crea el índice por regla (que F5, reglas desde los hechos,
reutilizará) y el botón "Add".

## Hechos del código y de los datos (verificados 2026-10-14)

- `resource_fts`: una fila por documento aceptado (`resources.ts`
  accept/reclassify, `/resources/search`), sin número de regla.
  `/resources/search` pasa `q` en bruto a `MATCH` y no filtra por evento.
- `case_rule_citation.rule_reference` es texto libre sin validar. La alta
  es la genérica (`registerCrud`, `routes/index.ts`); `crud.ts` solo
  tiene `skipDelete`, **no existe `skipCreate`**, y sus PUT/DELETE
  genéricos aceptan cualquier `rule_reference`. `position` la calcula el
  cliente (`CaseForm.tsx`). No hay `UNIQUE (case_id, rule_reference)`.
- `resource.layer` solo admite `rrs | class | event`. La pantalla de
  reclasificar solo envía `{kind:'rule', layer:'rrs'}` o
  `{kind:'example', scope:'own'}`: no puede pasar un documento a `event`
  ni elegir `doc_type`. Los NoR y SI de París se subieron con capa `rrs`
  (están en `data/rules/rrs/`).
- `draft.ts`: `CITATION_PATTERN` solo acepta `RRS|Rule`;
  `validateCitations` y `findExcerpt` usan subcadena sobre el corpus
  entero concatenado y sin prefijo (`4` pasa si existe `44`).
- `migrate.ts` es síncrono y corre en cada arranque del contenedor antes
  de `server.js` (`Dockerfile`); `schema.sql` se ejecuta entero con
  `db.exec` en cada arranque.
- **RRS (PDF):** cabeceras `número<tab>título` (`20.1 <tab> Hailing`,
  `A2.1 <tab> …`, `D1`): 198 en Parts, 391 en Appendix. Los números de
  apéndice se escriben **sin punto** (`C6.1`, `D1`, `A2.1`). En Appendix
  hay números repetidos porque cada apéndice trae reglas modificadas
  ("44 PENALTIES … Rule 44 is changed to:" aparece más de una vez, con
  texto distinto), y filas de tabla se leen como cabeceras falsas
  (`4 <tab> P, I, Z…`, `1 <tab> Preparatory flag` dentro de la regla 26;
  `0 <tab> Green flag`).
- **NoR y SI de París 2024 (PDF):** **sin tabuladores.** Cabeceras
  `número espacio texto` (`1.9 [DP] RRS 78.1 is changed…`,
  `1.1.1 [DP] [SP] …`), con grupo de primer nivel `1. RULES` (punto y
  mayúsculas), etiquetas `[DP] [NP] [SP]`, hasta 3-4 niveles. Ruido que
  una regex ingenua toma por cabecera: pies `2 of 15`, fechas
  `20 July – 9 August 2024`, `8 November 2023: Initial Version`, número
  de clase `470` repetido. En las SI, cada **Addendum** (A, B, C, D, E,
  K, cabecera de línea `Sailing Instruction Addendum E`) reinicia su
  numeración (`1.1`, `2.1`…): 212 candidatas, 145 números distintos.
  Las SI traen las enmiendas fusionadas ("Amendment 5, 3 August 2024"),
  y el título del fichero lo dice.
- Cases, Calls y apelaciones (capa 5) no tienen capa en `resource`.

## Alcance

**Dentro:**

1. **`resource.doc_type`** (`nor | si | si_amendment`, solo si
   `layer = 'event'`), columna aditiva con `ALTER TABLE` guardado,
   elegida al subir y **editable al reclasificar** (la pantalla de
   reclasificar gana capa, regata y `doc_type`).
2. **Índice por regla**: `rule_section` y `rule_section_fts`, con parser
   por estilos de cabecera (RRS tabulador; NoR/SI espacio) y noción de
   "parte" (apéndice o addendum).
3. **Búsqueda por regla** (`GET /rules/search`) y botón **"Add"**.
4. **Normalizador y formateador de citas** en un único módulo del
   servidor.
5. **Alta de cita validada en el servidor**, y bloqueo del camino
   genérico sin validar.
6. **Límites de token** y validación contra `rule_section` en `draft.ts`.
7. **Revisión al aceptar**: la pantalla de revisión muestra cuántas
   reglas se detectaron y avisa si son 0.
8. **Entrada nueva en `DECISIONS.md`** (D-034).

**Fuera de esta spec:**
- Reglas sugeridas desde Facts Found (F5), aunque el índice las habilita.
- Migrar o reescribir citas ya guardadas: **no se migran**.
- Casos, Calls y apelaciones nacionales (capa 5).
- Cambios en `extract.ts` (`rule_citations_candidate`, ISS-007) y en
  `PartyReference`.
- Partir por apartados `(a)`: el índice trabaja a nivel de número.
- Un `UNIQUE (case_id, rule_reference)` en la base (datos existentes
  podrían tener duplicados); la unicidad se comprueba en el servidor.

## Requisitos funcionales

- **RF-001 — `doc_type` y reclasificación.** Al subir una regla de capa
  `event` el usuario elige **por fichero** `NoR`, `SI` o `SI amendment`
  (obligatorio: sin él el fichero no se sube y el formulario lo dice; así
  se pueden subir un NoR y unas SI en la misma tanda). `reclassify` (UI y
  ruta) puede cambiar `kind`, capa, regata y `doc_type`; pasar a `event`
  sin `doc_type` válido devuelve 400; `doc_type` pasa a `NULL` al salir de
  `event`; al pasar a `example` se borran las secciones. Cambiar capa o
  `doc_type` **no** reconstruye secciones: el prefijo no se guarda en
  `rule_section`, se calcula al consultar (RF-003). Las citas ya guardadas
  con el prefijo anterior dejan de validarse y se muestran tal cual
  (RF-011). Los recursos `event` ya subidos quedan con `doc_type` `NULL`:
  buscables, pero con "Add" desactivado y el motivo "Classify this
  document first (Upload rules)". El servidor hace cumplir "`doc_type`
  solo con `event`" (la tabla no puede ampliar su `CHECK` sin recrearse).
- **RF-002 — Índice por regla.** Al aceptar un recurso `kind = 'rule'`, y
  al reclasificarlo a `rule` o a otro tipo de regla, el servidor lee el
  `.md` **antes** de abrir la transacción (el acceso a `node:sqlite` es
  síncrono; no hay `await` entre `BEGIN` y `COMMIT`), parte su Markdown en
  secciones y las guarda. Se detecta el estilo del documento contando
  cabeceras de cada estilo (gana el mayor; empate, tabulador):
  - *Tabulador* (RRS): línea que empieza por número
    `[A-Z]{0,2}\d+(\.\d+)*`, espacios y tabulador, con título no vacío.
  - *Espacio* (NoR/SI): línea que empieza por número `\d+(\.\d+)*`
    seguido de espacio y texto. Un número de **un solo nivel** cuenta solo
    si lleva punto final (`1. RULES`), es ≤ 99 (así `2024.` no es una
    cabecera) y el texto empieza por mayúscula, `[`, `(` o comilla
    (`"`, `“`, `‘`). Un número de **dos o más niveles** (`7.3.1`) cuenta con
    cualquier primer carácter, incluida minúscula (las SI usan `3.1.1 comply
    with…`).
  - **Filtros de ruido (ambos estilos):** se descartan el número `0`,
    pies `N of M`, y líneas que empiezan por un mes.
  - **Duplicados:** si un par (`number`, `part`) ya existe en el mismo
    documento, la línea **no abre una sección nueva** y queda dentro del
    cuerpo de la anterior (gana la primera aparición). Así las filas de
    tabla `4 <tab> P, I, Z…` o `1 <tab> Preparatory flag` (regla 26) no
    cortan ni duplican las reglas reales.
  - **Partes:** cabecera de parte = línea completa (anclada con `$`) que
    coincide con `Appendix X` / `APPENDIX X` (RRS) o `Sailing Instruction
    Addendum X` / `Notice of Race Addendum X` (NoR/SI). Una línea como
    `Appendix G is changed to:` **no** es cabecera de parte. Una cabecera
    de parte **cierra el cuerpo** de la sección anterior y fija la parte
    de las siguientes hasta la próxima cabecera de parte. Los Addendums
    que son solo tablas (A, B, C en las SI de París) no producen
    secciones.
  - Se guarda `number` canónico (mayúsculas, **sin punto entre la letra y
    el primer dígito**, `C.6.1` → `C6.1`), `heading`, `body`, `part`
    (`NULL` en el cuerpo principal) y `position`.
  - Si un documento no produce secciones, queda buscable como documento
    entero, sin "Add", y la revisión lo avisa (RF-013). Definiciones,
    Preamble y Race Signals del RRS no tienen número y no son citables.
- **RF-003 — Cita canónica y partes (regla sin estado).** Formato
  `<Prefijo> <número>`: `RRS` (capa `rrs`), `CR` (`class`), `NoR` (`event`
  + `nor`), `SI` (`event` + `si` o `si_amendment`). Ejemplos: `RRS 44.2`,
  `RRS A2.1`, `NoR 1.9`, `SI 12`. La etiqueta de **parte** depende solo de
  los campos de la propia sección, nunca del estado del corpus (subir o
  borrar un documento no cambia citas ya guardadas):
  - Sección sin parte (cuerpo principal): `RRS 44.2`, `SI 12`.
  - Sección de un **Addendum** (NoR/SI): siempre con parte,
    `SI Addendum E 2.14`.
  - Sección de un **Appendix** del RRS: sin parte si es **nativa**, es
    decir, su número empieza por la letra del apéndice (`A2.1` en el
    Appendix A, `D1` en el D, `C6.1` en el C): `RRS A2.1`. Con parte en
    cualquier otro caso (números numéricos o de otra letra: reglas
    modificadas por el apéndice): `RRS Appendix B 44`, `RRS Appendix B A5`.
  Una sola función (`rules/citation.ts`) construye **y resuelve** citas
  (`formatCitation` y su inversa `resolveCitation`); el buscador, el
  validador del alta, `draft.ts` y la UI la usan, y ninguna otra parte
  concatena prefijo y número. Si dos documentos del mismo prefijo y
  evento tienen la misma cita (SI y SI amendment, o dos ediciones del
  RRS), ambas secciones se ven en los resultados con su documento; la
  cita guardada es la misma y la validación pasa si existe alguna. El
  excerpt del borrador usa el documento aceptado más recientemente.
- **RF-004 — Búsqueda por regla.** `GET /rules/search?q=&case_id=` devuelve
  hasta 25 secciones: `section_id`, `citation`, `heading`, `snippet`,
  `layer`, `doc_type`, `part`, título del documento y `cited` (ya está en
  el caso). Solo secciones de recursos `accepted`; las de capa `event`
  solo si el `event_id` del recurso coincide con el del caso (derivado de
  `case_id`; sin `case_id` válido, solo `rrs` y `class`). La consulta se
  **sanea** antes de `MATCH` (términos entre comillas dobles): `44.2`,
  `c6.1` o `rule 44` no rompen FTS5. Si `q` es una cita o un número
  (`44.2`, `RRS 44`, `NoR 1.9`, `C6.1`), primero las coincidencias de
  número exacto (máx. 10, ordenadas por parte nula primero), después FTS
  hasta completar 25, sin repetir secciones. Si no hay resultados: "No
  rule found in the loaded corpus." y, solo si el caso tiene otras
  regatas con reglas subidas, la pista de que las reglas de evento solo
  aparecen para su regata.
- **RF-005 — Botón "Add".** (Se apoya en SPEC-023: la caja ya tiene cuadro
  de texto.) Cada resultado muestra la cita canónica, el título de la regla,
  el documento y el fragmento, con botón "Add" que, **en un solo clic**,
  registra la cita normalizada en `case_rule_citation` **y** la añade al
  final del cuadro `rules_applicable` (`prev ? prev + '
' + cita : cita`).
  Deja de ofrecerse si ya está en el caso. Los resultados viven dentro de
  `RulesSuggestions` (SPEC-023) y sustituyen su estado "read-only".
  *Propuesta pendiente de confirmar con el dueño.*
- **RF-006 — Texto libre como vía secundaria.** El campo actual sigue
  disponible. El servidor normaliza (`Rule 44`, `rule 44.2`, `R. 44`, `44`
  → `RRS …`; prefijos `CR`/`NoR`/`SI` se respetan; espacios, mayúsculas y
  puntos de más se limpian) y valida como en RF-009. Los alias de entrada
  (`Rule`, `R.`) solo se aceptan en la entrada y nunca se guardan.
- **RF-007 — Sin prefijo explícito.** Un texto sin prefijo se asume `RRS`
  solo si ese número existe como sección sin parte en el corpus `rrs`; si
  no, se rechaza con "Specify the document: RRS, CR, NoR or SI". No se
  adivina, aunque el número exista en NoR o SI.
- **RF-008 — Sin duplicados.** El servidor rechaza la misma cita canónica
  repetida en un caso. Comparación por forma canónica, así `Rule 44`
  antigua y `RRS 44` nueva cuentan como la misma (la comprobación mira
  también las citas viejas normalizadas en memoria, sin escribirlas).
- **RF-009 — Solo lo que está en el corpus (D-004).** El servidor rechaza
  una cita que no resuelva (`resolveCitation`) a una sección de un recurso
  **aceptado** del prefijo y, si es `NoR`/`SI`, del evento del caso. Con
  sufijo (`44.2(a)`) se comprueba el número base **y** que el texto `(a)`
  aparezca en el cuerpo de esa sección; si no, se rechaza. Mensaje: "Not
  found in the loaded rules: <cita>". La alta acepta `{case_id, text}` o
  `{case_id, section_id}`; en este segundo caso el servidor valida que la
  sección pertenece a un recurso aceptado y, si es `event`, al evento del
  caso (un id forjado no cita secciones ajenas). El `POST` de
  `rule-citations` pasa a una ruta propia con `skipCreate` y el `PUT`
  genérico se desactiva con `skipUpdate`: ambas opciones son **nuevas** en
  `crud.ts`. El `DELETE` genérico se conserva. El servidor calcula
  `position`.
- **RF-010 — Límites de token y validación.** Un número coincide solo si
  los caracteres anterior y posterior no son letra, dígito ni punto
  seguido de dígito: `4` no coincide con `44` ni con `14.1`; `42.1` no con
  `142.1`; `44` no con `44.1`. `draft.ts`:
  - `CITATION_PATTERN` acepta `RRS`, `CR`, `NoR`, `SI` (sin distinguir
    mayúsculas solo para `RRS` y `Rule`; `NoR`, `CR` y `SI` en su forma
    canónica, para que "si 12" en inglés no cuente) y parte opcional.
    `Rule` se conserva como alias de entrada.
  - `extractCitations` devuelve objetos `{prefix, part, number}`, no solo el
    número; `validateCitations(references, caseId)` resuelve cada cita con
    `resolveCitation` sobre `rule_section` (prefijo, evento del caso,
    parte) y no sobre el corpus concatenado. `CitationCheck.reference`
    sigue siendo el texto de la cita.
  - `findExcerpt` devuelve el cuerpo de la sección, truncado a 1500
    caracteres; el cuerpo de una sección termina en la siguiente cabecera
    de sección o de parte (RF-002). Una sección padre (`RRS 44`) solo
    contiene su título: su excerpt es corto y es aceptable.
- **RF-011 — Citas existentes intactas.** No se modifican en la base. Tras
  SPEC-023, Copy, Review y Download salen del texto del cuadro
  `rules_applicable` (y de `rule_reference` solo cuando el cuadro está
  vacío: fallback de SPEC-023 RF-007). No se marcan las citas antiguas: es
  decisión del dueño (no migrar, no marcar) y D-034 la registra y
  justifica frente a D-004 ("si no está seguro lo dice"): las citas
  antiguas las escribió el propio juez. El borrador IA, si no encuentra su
  texto, ya dice "text not found" sin inventar. No hay edición de cita;
  "normalizar al editar" significa: al volver a añadirla pasa por
  RF-006/RF-009.
- **RF-012 — Mensajes.** Todo texto visible en inglés: "Classify this
  document first (Upload rules)", "Not found in the loaded rules:
  <cita>", "Already cited", "Specify the document: RRS, CR, NoR or SI",
  "No rule found in the loaded corpus.", y los de error de red.
- **RF-013 — Aceptar con revisión.** La pantalla de revisión de una regla
  muestra "N rules detected" y una muestra (primeras y últimas cinco
  citas canónicas). Con 0 secciones avisa: "No numbered rules detected;
  this document cannot be cited by number." El resultado no bloquea
  aceptar (el documento sigue buscable entero).
- **RF-014 — Arranque idempotente y robusto.** `resource` gana
  `sections_indexed_at` (por `ALTER`, `NULL` por defecto). El arranque
  indexa los `rule` aceptados con `sections_indexed_at IS NULL`, **un
  recurso por vez** (lee el `.md`, luego transacción síncrona), y rellena
  la marca aunque produzca 0 secciones, para no reprocesar en cada
  arranque. Cualquier error de un recurso (falta el `.md`, error del
  parser, error de BD) se captura **por recurso**: se registra el aviso,
  se hace `ROLLBACK`, `sections_indexed_at` queda en `NULL` para
  reintentar y el arranque continúa. El arranque nunca falla por esto
  (`migrate.js` precede a `server.js` en el `Dockerfile`). `rule_section.id`
  es `AUTOINCREMENT` (los ids no se reutilizan, así no hay FTS huérfanas
  con ids reciclados). Borrar o rechazar un recurso borra las filas de
  `rule_section_fts` por `section_id` con `Number(...)` (D-023) **antes**
  del cascade; los ids de inserción FTS usan `Number(lastInsertRowid)`.
  Borrar un evento o un caso conserva el defecto heredado de
  `resource_fts` y se anota como deuda: con `AUTOINCREMENT`, las FTS
  huérfanas no pueden apuntar a otra sección.
## Decisiones técnicas propuestas

- Tablas aditivas (`CREATE ... IF NOT EXISTS`): `rule_section(id,
  resource_id → resource ON DELETE CASCADE, number, heading, body, part,
  position)` y `rule_section_fts(heading, body, section_id UNINDEXED)`.
  `doc_type` y `sections_indexed_at` solo por `ALTER` guardado en
  `migrate.ts` (no en `CREATE TABLE`, para no romper la base existente).
- Parser y normalizador como funciones puras (`resources/ruleSections.ts`,
  `rules/citation.ts`), comprobables con un script desechable (sin suite
  de tests, `constitution.md` → Calidad). El estilo del documento se
  detecta por recuento de cabeceras de cada estilo y gana el mayor.
- `GET /resources/search` se conserva para el fallback de documentos sin
  secciones; la pestaña usa `/rules/search`.
- UI: `RulePicker.tsx` nuevo (resultados por regla con "Add", cita ya
  añadida marcada), para no engordar `CaseForm` (ISS-006).
- Copia de seguridad: avisar al dueño de copiar `data/db` antes del
  redeploy, porque el arranque añade columnas y rellena un índice.
- D-034 en `DECISIONS.md`: citas por regla, formato canónico, partes,
  `doc_type`, índice por regla y validación en servidor. Anota que
  sustituye el diseño por documento de D-011/D-020 **en lo que respecta a
  citas**; no edita D-004.

## Decisiones del dueño (2026-10-14)

1. **Texto libre fuera del corpus:** se **rechaza** (D-004 estricto,
   RF-009).
2. **SI y SI amendment con el mismo número:** se citan igual, `SI <n>`.
3. **Índice por regla (opción A)** y **no migrar citas ya guardadas.**
4. **Subidas de prueba:** el dueño subió el NoR y las SI de París 2024
   para probar el parser (ya en `data/`, por error con capa `rrs`).

5. **Partes (confirmado):** en vez de bloquear los números repetidos, la
   cita lleva la parte cuando haría falta: `SI Addendum E 2.14`,
   `RRS Appendix B 44` (RF-003).

## Riesgos

- **Parser sobre PDF convertido:** cabeceras falsas o perdidas. Se
  mitiga con la revisión al aceptar (RF-013), el filtro de ruido de
  RF-002, y se prueba sobre los cuatro ficheros reales
  (RRS Parts, RRS Appendix, NoR, SI).
- **Formato nuevo de un documento futuro:** un NoR o SI en DOCX (mammoth)
  o con otra numeración puede dar 0 secciones: queda buscable entero, sin
  "Add", con aviso en la revisión. Se resuelve ampliando el parser, no
  relajando D-004.
- **Datos en producción:** el arranque añade dos columnas y rellena el
  índice. Aditivo e idempotente, pero toca `data/db`: copia previa y avisar
  antes del redeploy.
- **Rigidez de D-004:** un juez no podrá citar un documento no subido ni
  parseable. Es intencional.
- **ISS-002 es de riesgo alto:** la validación está en el servidor, no
  solo en la UI.
- **Cita con parte larga** (`SI Addendum E 2.14`) alarga el texto del
  documento final; es el coste de que sea inequívoca.

## Verificación

1. `npm run build` (api) y `npm run typecheck` (web) limpios.
2. Script desechable sobre los cuatro `.md` reales de
   `data/rules/rrs/`: nº de secciones por documento; `44`, `44.1`, `44.2`,
   `A2.1`, `D1` en RRS; `1.9` y `1.10` en NoR; `1.2.1`, `2.14` y los
   Addendums en SI; ausencia de `470`, `2 of 15`, `20 July…`; normalizador
   (`Rule 44` → `RRS 44`, `C.6.1` → `C6.1`, `NoR 1.9`, `R. 44`); límites de
   token (`4` vs `44`, `42.1` vs `142.1`, `44` vs `44.1`); `44.2(a)` vs
   `44.2(zz)`.
3. En vivo en `http://192.168.1.105:8086/` (pestaña Rules Applicable de SPEC-023): reclasificar NoR/SI a `event`
   con su `doc_type`; buscar "propulsion", "44.2" y "1.9" en Rules
   Applicable; "Add" crea `RRS 44.2` / `NoR 1.9` sin teclear; no se añade
   dos veces; `Rule 999` se rechaza; el "Add" también deja la cita en el cuadro; Remove (del registro) y Copy (del cuadro) funcionan; una regla
   `event` sin clasificar muestra "Add" desactivado.
4. Las tres vías de entrada de una cita (RF-005, RF-006, RF-010):
   - **Botón Add:** crear `NoR 1.9`; con un `section_id` forjado de otro
     evento o de un recurso pendiente, el servidor rechaza; subir otro
     documento no cambia las citas ya guardadas.
   - **Texto libre:** sin prefijo (`12`) → "Specify the document…"; `Rule
     44` antigua y `RRS 44` nueva cuentan como duplicado; `44.2(zz)` se
     rechaza; una cita `NoR`/`SI` de otro evento se rechaza; documento
     `event` sin clasificar no cita; `POST` genérico y `PUT
     /rule-citations/:id` devuelven error (probar con `curl`).
   - **IA (`draft.ts`):** `extractCitations`/`validateCitations` con `SI
     Addendum E 2.14`, `RRS Appendix B 44`, `Rule 4` frente a `44`; una
     cita antigua sin texto en el corpus sale "text not found"; una
     llamada real a `/cases/:id/draft` con la clave IA.
   - **Robustez:** búsqueda con `"`, `AND`, `NEAR(`, `*` no rompe; `q` muy
     larga se recorta; reject y DELETE limpian FTS; aviso de 0 secciones;
     arranque con un `.md` ausente continúa; rollback en fallo.
5. Parser sobre los cuatro `.md` (script): sin `RRS 4`/`RRS 1` falsos de
   las tablas de la regla 26; sin `SI 2024`; `SI 7.3.1`, `SI 19.3.1` y
   `NoR 3.5.5` presentes; Appendix B `44` con parte; `RRS A5` nativa sin
   parte y `RRS Appendix B A5` con parte; los Addendums A, B y C de las SI
   sin secciones.
6. Tras "Pull and redeploy": las RRS y las de París ya subidas aparecen
   con secciones sin volver a subirlas, y el arranque no las reprocesa
   en el siguiente reinicio.

# SPEC-022 — Rules Applicable: citar eligiendo una regla del corpus

Estado: draft. Fase F1 del replanteo de `issue.md` (ISS-002). Opción A
elegida por el dueño (2026-10-14): índice por regla; preguntas abiertas
resueltas. Pendiente de revisión del subagente `reviewer` antes de plan
y tasks. Sustituye a `SPEC-019` (reemplazada).

Relacionado: `DECISIONS.md` D-004 (nada se cita fuera del corpus
validado), D-011/D-020 (índice FTS de reglas, solo aceptadas), D-009
(flujo subir → revisar → aceptar), D-024 (panel de borrador IA),
`constitution.md` (citas), SPEC-021 (pestaña Rules Applicable).
`apps/api/db/schema.sql` (`resource`, `resource_fts`,
`case_rule_citation`), `apps/api/src/routes/resources.ts`,
`apps/api/src/routes/index.ts` (`rule-citations`),
`apps/api/src/ai/draft.ts`, `apps/web/src/components/CaseForm.tsx`
(`handleAddRule`, `rule-picker`), `ResourceUpload.tsx`.

## Intención

Hoy una cita nace de texto libre (`ruleText`, placeholder "e.g. RRS
18.2(b)") y el buscador del corpus indexa **documentos enteros**: un
resultado es "RRS Parts + fragmento", sin número de regla ni botón.
El juez tiene que reescribir a mano la cita y nada la comprueba.

El dueño quiere que **la cita nazca de elegir una regla del corpus**,
siempre con el mismo formato (`RRS 44.2`, `CR C.6.1`, `NoR 1.9`,
`SI 12`) y sin poder citar algo que no esté en las reglas subidas
(D-004). Esta spec crea el índice por regla (que F5, reglas desde los
hechos, reutilizará) y el botón "Add".

## Hechos del código y de los datos (verificados 2026-10-14)

- `resource_fts` tiene una fila por documento aceptado (`resources.ts`
  accept/reclassify, `/resources/search`), sin número de regla.
- `case_rule_citation.rule_reference` es texto libre sin validar
  (`registerCrud 'rule-citations'`, `routes/index.ts`).
- `resource.layer` solo admite `rrs | class | event` (`schema.sql`); no
  distingue NoR de SI. Las reglas `event` pertenecen a un solo evento
  (`event_id`), pero `/resources/search` hoy no filtra por evento.
- `draft.ts`: `CITATION_PATTERN` acepta `RRS|Rule`; `validateCitations` y
  `findExcerpt` usan subcadena (`corpus.includes(número)`): `4` pasa si el
  corpus contiene `44`.
- El RRS convertido es parseable: cada regla empieza una línea con
  número y tabulador (`20.1 <tab> Hailing`, `A2.1 <tab> …`). Prueba
  sobre `data/rules/rrs/*.md`: 198 cabeceras numeradas en Parts, 391 en
  Appendix (`44`, `44.1`, `44.2`, `A2.1`, `D1` presentes). Hay números
  repetidos dentro de un mismo documento (p. ej. `1`, `4`; en Appendix
  `44`, `A1`) y falsos como `0`, por cabeceras de página o tablas.
- Cases, Calls y apelaciones (capa 5) no tienen capa en `resource`.

## Alcance

**Dentro:**

1. **`resource.doc_type`** (`nor | si | si_amendment`, solo si
   `layer = 'event'`), columna aditiva con `ALTER TABLE` guardado
   (patrón de SPEC-016/017), elegida en `ResourceUpload.tsx` y editable
   en `reclassify`.
2. **Índice por regla**: tabla `rule_section` y `rule_section_fts`,
   construidos al aceptar y al reclasificar una regla, y recuperados al
   arrancar para las ya aceptadas (RF-002).
3. **Búsqueda por regla** (`GET /rules/search`) que devuelve secciones con
   su cita canónica, y botón **"Add"** en cada resultado.
4. **Normalizador y formateador de citas** en una sola función del
   servidor, usado por la alta de citas y por la validación.
5. **Alta de cita validada en el servidor**: solo se guarda una cita que
   exista como sección del corpus (RF-009).
6. **Límites de token** en `validateCitations` y `findExcerpt` de
   `draft.ts` (arregla `4` frente a `44`).
7. **Entrada nueva en `DECISIONS.md`**.

**Fuera de esta spec:**
- Reglas sugeridas desde Facts Found (F5), aunque el índice las habilita.
- Migrar o reescribir citas ya guardadas: **no se migran**; solo se
  normalizan al editarse (decisión del dueño). Las citas viejas se siguen
  mostrando tal cual.
- Casos, Calls y apelaciones nacionales (capa 5).
- Cambios en `extract.ts` (`rule_citations_candidate`, ISS-007 aplazado)
  y en `PartyReference`.
- Citas con subapartado `44.2(a)`: se aceptan al teclearlas, pero solo se
  comprueba el número base (RF-009); el índice no parte por `(a)`.

## Requisitos funcionales

- **RF-001 — `doc_type`.** Al subir una regla con capa `event`, el usuario
  elige `NoR`, `SI` o `SI amendment` (obligatorio). Para otras capas es
  `NULL`. `reclassify` puede cambiarlo. Los recursos `event` ya subidos
  quedan con `NULL`: figuran como "sin clasificar", se pueden buscar pero
  su botón "Add" está desactivado con el motivo "Classify this document
  first (Upload rules)".
- **RF-002 — Índice por regla.** Al aceptar (y al reclasificar) un recurso
  `kind = 'rule'`, el servidor parte su Markdown en secciones: una por
  cabecera de regla, definida como línea que empieza por número
  (`[A-Z]{0,2}\.?\d+(\.\d+)*`), seguido de espacios y un tabulador, con
  título no vacío; el número `0` se descarta. El texto de la sección va
  desde su cabecera hasta la siguiente cabecera. Se guarda `number`,
  `heading`, `body`, `position`. Al arrancar, un paso idempotente indexa
  los recursos ya aceptados que aún no tengan secciones. Borrar o
  rechazar un recurso borra sus secciones y su FTS (con `Number(id)`,
  ver gotcha de D-023). Un documento que no produzca ninguna sección
  sigue buscándose entero con la búsqueda de documentos actual, sin
  botón "Add".
- **RF-003 — Cita canónica.** Formato `<Prefijo> <número>`: `RRS` (capa
  `rrs`), `CR` (capa `class`), `NoR` (`event` + `nor`), `SI` (`event` +
  `si` o `si_amendment`). Ejemplos: `RRS 44.2`, `CR C.6.1`, `NoR 1.9`,
  `SI 12`. Una sola función construye la cita; ninguna otra parte del
  código concatena prefijo y número.
- **RF-004 — Búsqueda por regla.** `GET /rules/search?q=&event_id=` devuelve
  hasta 25 secciones, cada una con `section_id`, `citation`, `heading`,
  `snippet`, `layer`, `doc_type`, título del documento y si ya está
  citada en el caso. Solo secciones de recursos `accepted`. Las de capa
  `event` solo si su `event_id` coincide con el del caso. Si `q` parece
  una cita o un número (`44.2`, `RRS 44`, `c6.1`), las coincidencias
  exactas de número van primero; después, el resultado de FTS sobre
  `heading` y `body`.
- **RF-005 — Botón "Add".** Cada resultado muestra la cita canónica, el
  título de la regla, el documento de origen y el fragmento, con botón
  "Add" que crea la cita ya normalizada y deja de ofrecerla si ya está en
  el caso. Añadir no exige escribir nada.
- **RF-006 — Texto libre como vía secundaria.** El campo actual sigue
  disponible. El servidor normaliza lo escrito (`Rule 44`, `rule 44.2`,
  `R. 44`, `44` → `RRS …`; prefijo reconocido `CR`/`NoR`/`SI` se respeta;
  espacios, mayúsculas y puntos de más se limpian) y lo valida como en
  RF-009.
- **RF-007 — Sin prefijo explícito.** Un texto sin prefijo se asume `RRS`
  solo si ese número existe en el corpus `rrs`; si no, se rechaza con
  "Specify the document: RRS, CR, NoR or SI". No se adivina.
- **RF-008 — Sin duplicados.** No se puede añadir dos veces la misma cita
  canónica a un caso.
- **RF-009 — Solo lo que está en el corpus (D-004).** El servidor
  (`POST rule-citations`) rechaza con un mensaje claro una cita cuyo
  número base no exista como sección de un recurso aceptado del prefijo
  correspondiente (y, si es `NoR`/`SI`, del evento del caso). Se
  comprueba el número sin sufijo de apartado (`44.2(a)` → `44.2`).
- **RF-010 — Límites de token.** `validateCitations` y `findExcerpt`
  comparan con límites de token, no con subcadena: `4` no coincide con
  `44`, `42.1` no con `142.1`, `44` no con `44.1` salvo que se cite `44`.
  `CITATION_PATTERN` acepta además `CR`, `NoR` y `SI`, y se conserva
  `Rule` como alias de entrada.
- **RF-011 — Citas existentes intactas.** Las citas ya guardadas no se
  modifican en la base. Se muestran tal cual. Si el usuario las vuelve a
  añadir o edita, pasan por RF-006/RF-009.
- **RF-012 — Mensajes.** Todo texto visible en inglés. Búsqueda vacía:
  "No rule found in the loaded corpus. Upload it first (Upload rules)."
  Cita rechazada: "Not found in the loaded rules: <cita>".

## Decisiones técnicas propuestas

- Tablas nuevas (aditivas, `CREATE ... IF NOT EXISTS`, sin tocar
  datos): `rule_section(id, resource_id → resource ON DELETE CASCADE,
  number, heading, body, position)` y `rule_section_fts(heading, body,
  section_id UNINDEXED)`. `number` se guarda canónico (mayúsculas, sin
  espacios) para comparar por igualdad.
- Parser y normalizador como funciones puras en el servidor
  (`resources/ruleSections.ts` y `rules/citation.ts`), pequeñas y
  comprobables con un script desechable (el proyecto no tiene suite de
  tests, `constitution.md` → Calidad).
- `POST /rule-citations` pasa de la alta genérica de `registerCrud` a una
  ruta propia (`skipCreate`, patrón ya usado con `skipDelete` en
  `routes/index.ts`) que normaliza y valida. El borrado sigue siendo el
  genérico.
- El buscador antiguo `GET /resources/search` se conserva para el
  fallback de documentos sin secciones; la UI de la pestaña usa
  `/rules/search`.
- UI en la pestaña Rules Applicable (SPEC-021): el bloque `rule-picker`
  pasa a mostrar resultados por regla con "Add"; se extrae a un
  componente propio (`RulePicker.tsx`) para no engordar `CaseForm`
  (ISS-006).
- Entrada nueva en `DECISIONS.md` (D-031): citas por regla, formato
  canónico, `doc_type`, índice por regla y validación en servidor.
  No edita D-004.

## Decisiones del dueño (2026-10-14)

1. **Texto libre fuera del corpus:** se **rechaza** (D-004 estricto,
   RF-009). No hay modo "unverified".
2. **SI y SI amendment con el mismo número:** basta con mostrar ambos con
   su documento en los resultados; la cita guardada es `SI <n>` en los dos
   casos, sin prefijo distinto para enmiendas.
3. **Índice por regla (opción A)** y **no migrar citas ya guardadas.**

## Riesgos

- **Parser sobre PDF convertido:** cabeceras repetidas o falsas
  (`0`, tablas, números de página). Mitigación: la revisión de la
  conversión ya existe (D-009); el parser descarta títulos vacíos y `0`;
  los números repetidos quedan como secciones distintas visibles con su
  documento. Se prueba sobre los dos ficheros RRS reales.
- **Datos en producción:** el arranque rellena el índice de recursos ya
  aceptados y añade una columna. Es aditivo e idempotente, pero toca la
  base de producción: avisar al dueño antes del redeploy.
- **Rigidez de D-004 estricto:** un juez no podrá citar una regla de un
  documento no subido ni parseable. Es intencional.
- **ISS-002 es de riesgo alto** (cita falsa convincente). La validación
  en servidor, y no solo en la UI, es la mitigación principal.

## Verificación

1. `npm run build` (api) y `npm run typecheck` (web) limpios.
2. Script desechable sobre los `.md` reales de `data/rules/rrs/`: nº de
   secciones, `44`, `44.1`, `44.2`, `A2.1` presentes; normalizador
   (`Rule 44` → `RRS 44`, `rule 44.2`, `44`, `C.6.1`, `NoR 1.9`);
   límites de token (`4` vs `44`, `42.1` vs `142.1`, `44` vs `44.1`).
3. En vivo en `http://192.168.1.105:8086/`: buscar "propulsion" y "44.2"
   en Rules Applicable; "Add" crea `RRS 44.2` sin teclear; no se puede
   añadir dos veces; texto libre `Rule 999` se rechaza; Remove y Copy
   funcionan; una regla `event` subida con `doc_type` aparece como
   `NoR`/`SI`; una `event` sin clasificar muestra "Add" desactivado.
4. Tras "Pull and redeploy": reconfirmar, y comprobar que las reglas RRS
   ya subidas aparecen con secciones sin volver a subirlas.

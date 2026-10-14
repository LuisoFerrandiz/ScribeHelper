# issue.md — Problemas detectados (grafo graphify + revisión)

Documento para que Claude lo lea y resuelva los problemas de uno en uno.
Origen: grafo `graphify-out/` reconstruido el 2026-10-13 (706 nodos, 1182
aristas, 59 comunidades) más lectura de `constitution.md`, specs y
`.gitignore`.

## Cómo trabajar con este archivo

1. Lee `CLAUDE.md` y `constitution.md` antes de tocar nada.
2. Resuelve **un issue por vez**, en el orden de prioridad (P1 → P3).
3. Los issues marcados **[DECISIÓN]** necesitan respuesta del dueño antes
   de implementar: pregunta, no adivines.
4. Cambios de comportamiento o de diseño → entrada nueva en `DECISIONS.md`
   (append-only). Trabajo con spec → `specs/SPEC-NNN-*.md` + plan + tasks.
5. Definición de terminado: la de `CLAUDE.md` (typecheck/build, verificación
   en vivo, commit). **No hagas commit ni push sin que el dueño lo pida.**
6. Al cerrar un issue, marca `Estado: resuelto` con la fecha y el commit.

Leyenda: P1 = riesgo real, P2 = deuda con efecto probable, P3 = mejora.

## Plan por fases

Cada fase termina en algo verificable. No empieces una fase sin cerrar la
anterior ni sin el visto bueno del dueño en los puntos **[DECISIÓN]**.

| Fase | Issues | Objetivo | Riesgo | Bloqueo |
|---|---|---|---|---|
| 0 | ISS-001 | Cerrado: todo el material de `data/` es público. | — | — |
| 1 | ISS-003 | Sacar salida de graphify de Git y excluir `converted/` del grafo. | Bajo | [DECISIÓN] dueño |
| 2 | ISS-004, ISS-008 | Config MCP estable y verificar borrado de adjuntos. Solo comprobar y ajustar config. | Bajo | [DECISIÓN] ISS-004 |
| 3 | ISS-005, ISS-009 | Alinear tipos API/web; reconstruir grafo con extra `sql`. | Bajo | — |
| 4 | ISS-002 (ISS-007 aplazado) | Spec de grounding de citas. Spec primero, código después. ISS-007 sigue abierto, sin fecha. | **ALTO** (ISS-002) | — |
| 5 | ISS-006 | Spec de refactor de `CaseForm.tsx`, extracción por pasos. | Medio | Fases 3-4 cerradas |

Orden de riesgo: la fase 4 es la de mayor riesgo por D-004 (cita falsa convincente). El
refactor va al final: sin tests, conviene que el formulario esté estable.

Riesgos altos:

- **ISS-002 — ALTO.** Una cita no verificada presentada como regla rompe un
  límite no negociable (D-004). Latente hoy; se activa al conectar la UI.
- **ISS-006 — MEDIO.** Refactor de 1125 líneas sin suite de tests: riesgo de
  regresión silenciosa. Mitigar con pasos pequeños y verificación en vivo.

---

## ISS-001 — CERRADO Datos de casos versionados en Git

- **Estado:** resuelto (2026-10-13), sin cambios de código.
- **Resolución:** el dueño confirma que todas las decisiones y los
  formularios de protesta de `data/` (OG24, SOF26, Snipe Worlds 2026, 20th
  Asian Games) son públicos y están en webs públicas. No hay datos privados
  de competidores, así que no se incumple `constitution.md` ("Seguridad y
  datos") ni hace falta tocar `.gitignore` ni reescribir historial.
- **Pendiente menor:** si en el futuro se suben casos reales de una regata
  propia, esos ficheros no serían públicos: revisar entonces. Considerar una
  línea en `constitution.md` que lo recoja.

## ISS-002 — P1 `rule_citations_candidate` sin grounding contra el corpus

- **Estado:** **cerrado (2026-10-14)**. El replanteo lo convirtió en la fase
  F1: `specs/SPEC-022-reglas-aplicables-desde-corpus.md` v3. Implementado en
  `b26325c`, desplegado y verificado en vivo (D-034): índice por regla,
  cita canónica con parte, `doc_type`, alta validada en el servidor,
  `draft.ts` por límites de token. Queda fuera lo que dependía de F5/F6:
  la validación de referencias tecleadas a mano en las cajas de texto y
  `rule_citations_candidate` (ISS-007, aplazado). Origen: GAP heredado de
  `SPEC-003`.
- **Evidencia:** `specs/SPEC-003-documentacion-previa.md` líneas ~112-130 y
  `specs/SPEC-003-plan.md` "GAP heredados". `apps/api/src/ai/extract.ts`
  devuelve `rule_citations_candidate` (líneas 18, 72, 169) sin
  instrucciones de formato en el prompt y sin validar contra `rules/`/FTS.
  Nodo del grafo: `GAP: conclusion/decision/rule_citations candidates not
  wired to UI`.
- **Por qué importa:** `DECISIONS.md` D-004 — *nada se cita si no está en el
  corpus validado*. Hoy no tiene UI, así que el riesgo está latente. Si se
  conecta tal cual, saldría una cita sin verificar.
- **Qué hacer:** antes de conectar nada a la UI, crear spec: definir formato
  esperado (`RRS 44` vs `Rule 44` vs número), validar cada candidato contra
  el corpus (FTS) y descartar o marcar lo que no exista.
- **Plan acordado con el dueño (2026-10-13):**
  1. Formato canónico único, en una sola función: `RRS` + número +
     subapartado entre paréntesis (`RRS 44.2`, `RRS 36(b)`). Patrón tomado
     de `data/phrases/base/preferred-standard-wording.md` (World Sailing,
     Preferred Standard Wording 2025.08.15), que usa ese formato siempre.
  2. Normalizar lo que devuelva la IA (`Rule 44`, `rule 44.2`, `44`) al
     formato canónico.
  3. Validar cada candidato contra el corpus de `rules/` (FTS). Ese
     documento no basta: solo contiene las reglas de sus frases de ejemplo.
     Si no existe en el corpus, descartar o marcar "no verificada".
  4. Mostrar siempre como "alegado por la parte", nunca como regla aplicable.
  5. Añadir el formato al prompt de `extract.ts`.
  Empezar por una spec (`specs/SPEC-NNN-*.md`), no por código.
- **Decisión del dueño (2026-10-13):** el formato canónico es `RRS ...` y
  se normaliza **todo** con él, no solo lo que devuelve la IA.
- **Puntos donde hoy entra una cita (verificados en código):**
  1. `apps/web/src/components/CaseForm.tsx` `handleAddRule` (~l.368): guarda
     `ruleText.trim()` tal cual; el campo es texto libre (placeholder
     `e.g. RRS 18.2(b)`). También el selector de corpus (`rule-picker`).
  2. `apps/api/src/routes/index.ts` ~l.74 (`registerCrud 'rule-citations'`):
     escribe `case_rule_citation.rule_reference` sin validar. Es el sitio
     donde normalizar de forma que valga para cualquier cliente.
  3. Datos ya guardados en `case_rule_citation.rule_reference` (SQLite,
     `data/db/`): migración idempotente al arrancar, con copia previa de la
     BD. Produce datos en producción: avisar al dueño antes.
  4. `apps/api/src/ai/extract.ts` (`rule_citations_candidate`).
  5. `apps/api/src/ai/draft.ts`: `CITATION_PATTERN` acepta `RRS` **y**
     `Rule`; `extractCitations` descarta el prefijo y devuelve solo el
     número; el prompt dice "Rules already cited". Normalizar también el
     texto que devuelve la IA (`Rule 44` → `RRS 44`).
- **Debilidad ya existente en la validación (corregir en la misma spec):**
  `validateCitations` y `findExcerpt` (`draft.ts`) comprueban con
  `corpus.includes(numero)`. Por eso `RRS 4` pasa como "encontrada" si el
  corpus contiene `44`, y `42.1` si contiene `142.1`. Hay que comparar con
  límites de token, no con subcadena simple.
- **Casos límite a cubrir en el normalizador:** apéndices y letras
  (`C2.1`, `N1.4(b)`, `A9`), subapartados anidados (`63.7(a)`), definiciones
  (`RRS Definition: Mark-Room`), mayúsculas/minúsculas, `Rule`/`rule`/`R.`,
  y espacios o puntos de más.
- **Decisión del dueño (2026-10-13): prefijo fijo por capa.**
  | Prefijo | Significado | Capa (`resource.layer`) |
  |---|---|---|
  | `RRS` | Reglamento de Regatas a Vela | `rrs` |
  | `CR` | Class Rule (reglas de clase) | `class` |
  | `NoR` | Notice of Race (anuncio de regatas) | `event` |
  | `SI` | Sailing Instructions | `event` |
  Ejemplos: `RRS 44.2`, `CR C.6.1`, `NoR 1.9`, `SI 12`.
- **Decisión del dueño (2026-10-13): opción (a), campo `doc_type`.** La capa
  `event` agrupa NoR y SI (y enmiendas a las SI) bajo un solo valor, y
  `resource.layer` solo admite `rrs | class | event` (`schema.sql` ~l.187),
  así que el prefijo no se podía derivar de la capa. Solución:
  - Columna aditiva `resource.doc_type` con valores `nor | si |
    si_amendment`, solo para recursos con `layer = 'event'`; `NULL` en el
    resto. Migración guardada como las de SPEC-016 (`ALTER TABLE` con guard,
    idempotente).
  - El usuario la elige al subir el documento (`ResourceUpload.tsx`).
  - Mapa de prefijo: `rrs`→`RRS`, `class`→`CR`, `event`+`nor`→`NoR`,
    `event`+`si` y `event`+`si_amendment`→`SI`.
  - Recursos `event` ya subidos tendrán `doc_type` vacío: pedir al dueño que
    los clasifique, y mientras tanto tratarlos como "sin clasificar".
  - A decidir en la spec: si el selector de reglas y la validación
    distinguen enmienda de SI (la enmienda prevalece, capa 4).
- **Normalizador por prefijo:** `Rule`/`rule`/`R.` sin prefijo explícito se
  asumen `RRS`; un prefijo reconocido (`CR`, `NoR`, `SI`) se respeta. Un
  texto sin prefijo y que no cuadre con el RRS se marca "sin clasificar",
  no se adivina.
- **Replanteado (2026-10-13):** `specs/SPEC-019-citas-normalizadas.md` queda
  reemplazada. Nuevo enfoque: la cita nace de **elegir una regla del corpus**
  (botón "Add" en el selector, hoy inexistente) y de los hechos probados, no
  de texto libre. Ver "Replanteo" al final de este archivo y el plan en
  `.claude/plans/` (fuera del repo).
- **Criterio de cierre:** spec aprobada por el dueño; ningún candidato se
  muestra como cita si no está en el corpus.

## ISS-003 — P2 Salida de graphify versionada, con rutas absolutas y copias de datos

- **Estado:** resuelto (2026-10-13), commit `45f4be4`: `graphify-out/` en `.gitignore`, sacado del índice con `git rm --cached` (los ficheros siguen en disco) y `.graphifyignore` con `graphify-out/`.
- **Evidencia:** `git ls-files graphify-out` incluye
  `.graphify_python` (ruta absoluta del intérprete) y `.graphify_root`.
  `graphify-out/converted/` contiene una copia convertida de
  `preferred-standard-wording`, que el grafo detectó como duplicado
  (`semantically_similar_to`) de `data/phrases/base/…`.
- **Por qué importa:** `constitution.md` — *"Solo rutas relativas"*.
  Además `.graphify_python` es específico de esta máquina, y el grafo se
  contamina con duplicados que ensucian el análisis.
- **Qué hacer:**
  1. [DECISIÓN] ¿Versionar `graphify-out/` o ignorarlo? Si se ignora,
     añadirlo a `.gitignore` y `git rm -r --cached graphify-out`.
  2. Si se versiona, ignorar al menos `.graphify_python` y `.graphify_root`.
  3. Excluir `graphify-out/converted/` del análisis (fichero
     `.graphifyignore`) y valorar excluir `data/` si ISS-001 lo saca de Git.
- **Criterio de cierre:** una reconstrucción del grafo no produce nodos
  duplicados de `converted/` y no se commitean rutas absolutas.

## ISS-004 — P2 `.mcp.json` con rutas absolutas de esta máquina

- **Estado:** resuelto (2026-10-13), commit `06fbb27`, por decisión del dueño: se deja la ruta completa a `uv.exe` (`Python313\Scripts`). Sin cambios. Riesgo aceptado: si cambia la versión de Python, la ruta se rompe y hay que actualizarla. Falta solo confirmar con `/mcp` tras reiniciar Claude Code.
- **Evidencia:** `.mcp.json` (commit `06fbb27`) apunta a
  `C:\Users\luiso\AppData\Roaming\Python\Python313\Scripts\uv.exe` y a la
  carpeta del servidor `mcp-grammar-checker`. Ya falló una vez al cambiar
  de ruta/versión de Python.
- **Qué hacer:** [DECISIÓN] elegir entre (a) `"command": "uv"` confiando en
  el PATH, (b) dejarlo como está y documentarlo, o (c) mover el fichero a
  config de usuario y no versionarlo. Probar la opción elegida con un
  handshake MCP real antes de darla por buena.
- **Nota:** el servidor de `.claude/mcp-servers/mcp-grammar-checker` es de
  terceros: **no modificar su código**. Su `git status` debe seguir limpio.
- **Criterio de cierre:** `/mcp` muestra `grammar-checker` conectado en una
  sesión nueva tras reiniciar Claude Code.

## ISS-005 — P2 Tipo `AttachmentExtraction` duplicado entre API y web

- **Estado:** resuelto (2026-10-13), commit `2e83660`. Sin deriva hoy; comentarios cruzados añadidos en los 4 tipos (`extract.ts`, `extractNotes.ts`, `types.ts` x2). `npm run typecheck` (web) y `npm run build` (api) pasan limpios. Los dos tipos
  (`apps/api/src/ai/extract.ts` l.5 y `apps/web/src/types.ts` l.99) tienen
  los mismos 10 campos con los mismos tipos; solo difiere un comentario.
  `NotesExtraction` (`extractNotes.ts` l.4 y `types.ts` l.117) también es
  idéntico. El riesgo es futuro: añadir o renombrar un campo en un lado sin
  el otro no lo detecta `tsc`. Propuesta mínima (no aplicada): comentario
  cruzado en los 4 sitios ("mantener igual que ..."); ISS-002 va a tocar
  `rule_citations_candidate`, así que conviene hacerlo antes.
- **Evidencia:** el grafo muestra dos nodos `AttachmentExtraction`:
  `apps/api/src/ai/extract.ts` y `apps/web/src/types.ts`.
- **Por qué importa:** cualquier cambio en la extracción (p. ej. ISS-002)
  puede divergir entre backend y frontend sin que `tsc` lo detecte, porque
  son proyectos separados.
- **Qué hacer:** comprobar si los dos tipos coinciden hoy. Si hay deriva,
  corregirla. Valorar un tipo compartido o un comentario-referencia cruzado
  en ambos. No introducir un paquete nuevo sin consultar.
- **Criterio de cierre:** los dos tipos son idénticos o están enlazados de
  forma explícita; `npm run typecheck` (web) y `npm run build` (api) pasan.

## ISS-006 — CERRADO `CaseForm.tsx` concentra demasiada lógica

- **Estado:** resuelto (2026-10-14) por `SPEC-024` (spec v2 revisada, 10 pasos
  con un commit cada uno, de `57568d9` a `44cfca5`; desplegados y verificados
  uno a uno). `CaseForm.tsx` pasó de **1091 a 758 líneas**. Se extrajeron
  `TabBar`/`caseTabs`, `caseDrafts`, `refreshCasePart`, `ReviewTab`,
  `GeneralTab`, `AttachmentsTab`, `WritingBox` (usado por las cinco cajas de
  redacción) y `PartiesTab`. Sin cambio de comportamiento: 18 hashes de DOM
  (9 pestañas × TEST-01 y TEST-02) idénticos en cada paso y comprobaciones de
  comportamiento en vivo. Decisión: D-035.
- **Pendiente opcional:** paso 5 de SPEC-024 (hooks `useNotesExtraction` y
  `useCaseSave`), solo a petición del dueño (riesgo alto, ~550-600 líneas).
- **Evidencia (2026-10-13):** `apps/web/src/components/CaseForm.tsx` tenía 1125 líneas;
  `CaseForm()` es el nodo más conectado del grafo (36 aristas, el siguiente
  tiene 19). La comunidad "CaseForm Core" tiene cohesión 0.068 (baja).
- **Por qué importa:** cada spec (SPEC-011…018) ha tocado este fichero; el
  coste de cambio y el riesgo de regresión crecen, y no hay suite de tests.
- **Qué hacer:** no refactorizar a ciegas. Primero proponer una spec de
  refactor con límites claros (qué se extrae, qué no cambia de
  comportamiento) y verificar en vivo tras cada extracción.
- **Criterio de cierre:** spec aprobada; refactor hecho sin cambio de
  comportamiento observable en `http://192.168.1.105:8086/`. **Cumplido.**

## ISS-007 — P3 `conclusion_candidate` / `decision_candidate`: GAP obsoleto

- **Estado:** el GAP de `SPEC-003` ya no existe; verificado en código
  (2026-10-13). Los dos campos **sí tienen UI**: `CaseForm.tsx` l.981 y
  l.1077 los ofrecen como "From protest form" en los paneles de sugerencias
  de Conclusion (SPEC-007) y Decision (SPEC-012), junto a "From hearing
  notes" (SPEC-017). El prompt de `extract.ts` l.123 ya avisa de que casi
  siempre vendrán vacíos.
- **Error del análisis inicial:** este issue se abrió desde `SPEC-003`, que
  quedó desactualizada, sin comprobar `CaseForm.tsx`. La recomendación de
  "quitarlos" se basó en esa premisa falsa.
- **Decisión del dueño (2026-10-13):** dejar los campos como están por ahora
  y **mantener el issue abierto**: toda esta parte de la extracción y las
  sugerencias "From protest form" se va a reconstruir en el futuro. No
  quitar ni modificar `conclusion_candidate`/`decision_candidate` en
  `AttachmentExtraction`, en el prompt de `extract.ts` ni en los dos
  `protestForm` de `CaseForm.tsx` hasta que exista una spec de rediseño.
  `NotesExtraction` (hearing notes) queda fuera de este issue.
- **Cuando se retome:** abrir spec propia; revisar junto con ISS-002
  (`rule_citations_candidate`) y ISS-006 (tamaño de `CaseForm.tsx`), porque
  los tres tocan la misma extracción. Actualizar o archivar `SPEC-003`, que
  hoy describe un GAP que ya no existe.
- **Estado:** abierto, aplazado (sin fecha).

## ISS-008 — P3 Limpieza de adjuntos al borrar un caso: verificar

- **Estado:** verificado en código (2026-10-13); falta prueba en vivo.
  `apps/api/src/routes/caseDelete.ts` lee los `case_attachment` del caso,
  llama a `deleteAttachmentFiles` (`case-attachments/storage.ts`, `rm` con
  `force: true` del `.md` y del original) y luego borra la fila
  `protest_case`; el resto sale por `ON DELETE CASCADE`. `crud.ts` ya no
  registra el DELETE genérico (`skipDelete: true`, `routes/index.ts` l.61),
  y la ruta exige admin (`requireAdmin`). Sin hueco de ficheros huérfanos.
  Observación menor: los ficheros se borran antes que las filas; si el
  borrado de la BD fallara, quedarían filas sin fichero. Probabilidad baja.
  Pendiente: probar en vivo en `http://192.168.1.105:8086/` con un caso de
  prueba y comprobar que desaparecen los ficheros de `data/case_attachments/`.
  Sin comprobar aún que `case_link` se borra en ambas direcciones.
- **Evidencia:** la memoria de handoff del 2026-10-05 anotaba un hueco: el
  `DELETE /cases/:id` genérico no limpiaba ficheros de adjunto. `SPEC-015`
  (RF-004) lo cubre con un borrado de ficheros solo para admin.
- **Qué hacer:** comprobar en código (`apps/api/src/routes/`) y en vivo que
  borrar un caso con adjuntos elimina `.md` y original en
  `data/case_attachments/` y que no quedan filas huérfanas. Si ya funciona,
  cerrar el issue con la evidencia.
- **Criterio de cierre:** prueba en vivo documentada.

## ISS-009 — P3 Calidad del grafo (no afecta al producto)

- **Estado:** resuelto (2026-10-13). Instalado `graphifyy[sql]`; `graphify update .` reconstruyó el grafo: 748 nodos, 1252 aristas, 69 comunidades. `schema.sql` entra con 27 nodos (tablas). Dangling 0, missing 0, self-loops 0 (antes 21 dangling). Las etiquetas de comunidad se renombraron por su hub (había 59 y ahora 69): `graphify label` o `/graphify --cluster-only` las vuelve a nombrar. Quedan sin cubrir D-027 de `DECISIONS.md` y los PDF originales. `graphify-out/` está ignorado, no hay nada que commitear.
- **Evidencia:** chequeo de salud: 21 aristas dangling, 36 colapsadas,
  219 nodos débilmente conectados. `schema.sql` no entra en el grafo
  porque falta `tree_sitter_sql` (`pip install "graphifyy[sql]"`).
  El nodo de `D-027` quedó mínimo (el subagente no leyó esa parte de
  `DECISIONS.md`), y los PDF originales se omitieron por duplicar los `.md`.
- **Qué hacer:** instalar el extra `sql`, reconstruir con
  `/graphify . --update` y revisar las aristas dangling de SPEC-012/013/014
  (ids supuestos entre chunks). Baja prioridad.
- **Criterio de cierre:** dangling < 5 o explicadas; `schema.sql` presente
  en el grafo.

---

## Fuera de alcance (no abrir issue)

- La ausencia de suite de tests es decisión documentada en
  `constitution.md` → Calidad.
- Los tsconfig y package.json duplicados entre `apps/api` y `apps/web` son
  esperables en un monorepo sin workspaces.

---

## Replanteo (2026-10-13) — cinco fuentes y cadena de redacción

Modelo: fuentes 1 RRS, 2 ejemplos, 3 formulario de protesta, 4 NoR/SI, 5
frases. Cadena: Hearing notes → Facts Found → Rules Applicable → Conclusion →
Decision. Una cita solo puede venir de 1 o 4. Fases:

| Fase | Contenido | Issue | Estado (2026-10-14) |
|---|---|---|---|
| F1 | Rules Applicable: botón "Add" desde el corpus, cita canónica con parte, `doc_type`, índice por regla, validación por límites de token | ISS-002 | **Hecha y desplegada**: `SPEC-022`, D-034, `b26325c` |
| F2 | Lista única de sugerencias, un clic copia al cuadro | ISS-006 (facilita) | **Hecha y desplegada**: `SPEC-020`, D-030 |
| F3 | Frases con huecos y relleno; inserción al cursor | SPEC-025 | Hecho (ccd231d, verificado en vivo) |
| F4 | IA que complementa solo lo que las frases no dicen | — | **Hecha y desplegada** (alcance: huecos de datos): `SPEC-031`, D-042, `bbf977e`, verificada en vivo |
| F5 | Reglas sugeridas desde Facts Found (FTS) | ISS-002 | **Hecha y desplegada**: `SPEC-027`, D-038, `244f436` (verificada en vivo) |
| F6 | Cadena coherente, aviso de desfase y validar referencias tecleadas en Rules Applicable | ISS-010 | **Hecha y desplegada**: aviso de huecos (SPEC-026, D-037), referencias tecleadas (SPEC-028, D-039), desfase entre cajas (SPEC-029, D-040) y fantasma con las cajas anteriores (SPEC-030, D-041, `42dd98d`). Queda fuera el panel de borrador (sin montar) |

Trabajo añadido durante el replanteo, ya desplegado salvo lo indicado:

- `SPEC-021`: Rules Applicable en pestaña propia (6), entre Conclusion y
  Decision; Review pasa a 8. `c3e6c1b`.
- `SPEC-023` (D-032): Rules Applicable como caja de redacción con campo
  `rules_applicable`, texto fantasma sin números de regla, aviso "Insert
  missing" y cuadro también en Review. `4acf5de`; el ajuste de columnas
  (cuadro a la izquierda, sugerencias a la derecha) `4f24294` está
  commiteado pero **sin push ni redeploy**.
- D-031: se quitó la entrada "Jury" del menú superior. `4de41e5`.
- Fix `client_max_body_size 50m` en nginx (las subidas de más de 1 MB
  daban 413). `1063cdf`.

## ISS-010 — P2 Coherencia entre cajas (Facts → Rules → Conclusion → Decision)

- **Estado:** abierto (fase F6).
- **Evidencia:** `apps/api/src/ai/draft.ts` solo lee la caja inmediatamente
  anterior (Decision ve Conclusion, no Facts ni reglas); su rama en el panel
  es código muerto para las 4 cajas. `complete.ts` (ghost text) ve solo los
  últimos 1500 caracteres, sin datos del caso. Si cambia un hecho probado,
  nada avisa de que la conclusión y la decisión pueden haber quedado
  desfasadas.
- **Criterio de cierre:** spec aprobada; las cajas posteriores ven las
  anteriores relevantes y la UI avisa del desfase.

## ISS-011 — CERRADO Ya no se puede quitar un juez del pool del evento

- **Estado:** cerrado, aceptado sin acción (2026-10-14). El dueño aclaró que
  solo quería quitar "Jury" del menú general y mantener la caja "Jury
  Members" al final de Review (donde se eligen los jueces del caso y se
  marca al presidente). No necesita una pantalla para quitar jueces del
  pool. Se limpió el resto de código ligado al menú: `api.deleteJuryMember`
  (sin uso) y dos comentarios de `CaseForm.tsx` que hablaban de una futura
  pestaña de jurado.
- **Origen:** D-031 quitó la entrada "Jury" del menú superior y borró
  `JuryPanel.tsx`, la única pantalla que llamaba a `deleteJuryMember`.
  Añadir jueces sigue funcionando desde `JurySlots`.
- **Qué hacer:** si hace falta, spec pequeña para quitar un juez del pool
  desde `JurySlots`. Sin urgencia.

## ISS-012 — CERRADO `CLAUDE.md` y `constitution.md` desactualizados tras SPEC-023

- **Estado:** resuelto (2026-10-14) por orden del dueño, D-033. `CLAUDE.md`
  actualizado en sitio (cinco cajas, mecanismos de sugerencia, fila 5.7 de
  fases, método SDD y pestañas del caso). `constitution.md` no se edita
  (es append-only): sección "Enmiendas" con la entrada del 2026-10-14.

## ISS-013 — P3 NoR y SI de París 2024 subidos con la capa equivocada

- **Estado:** **resuelto en producción (2026-10-14)**: reclasificados a
  `event` (NoR → `nor`, SI → `si_amendment`, regata TEST). Los cuatro
  ficheros de `data/` no se versionan (decisión del dueño, 2026-10-14).
- **Evidencia:** `data/rules/rrs/Paris-2024-Sailing-Notice-of-Race_…` y
  `…Sailing-Instructions…` (`.md` y PDF original en `data/originals/`) se
  subieron con capa `rrs`, y la pantalla de reclasificar no puede pasar a
  `event`. Sin versionar en Git.
- **Qué hacer:** tras implementar SPEC-022 (reclasificar con capa, regata y
  `doc_type`), pasarlos a `event` con `nor` y `si_amendment`. No se versionan
  (decisión del dueño). Sirvieron para ajustar el
  parser de SPEC-022 (estilo "número espacio texto", Addendums).

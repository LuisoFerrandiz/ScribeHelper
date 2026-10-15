# SPEC-033 — Documentos permanentes y de evento

Reorganiza la pantalla "Upload rules" y el modelo de capas de las reglas, y
arregla el parser para el formato de reglas de clase (`A.1`, `C.1.1`). Estado:
v2 (tras `reviewer`: 4 bloqueantes y varios importantes recogidos). Nace de la
prueba en vivo de subir las reglas de clase de la SB20 (2026-10-15): se
indexaron 2 secciones basura en vez de las reales, y quedó claro que las
reglas de clase no son globales.

## Problema

1. **Modelo de capas.** Hoy hay tres capas (`rrs`, `class`, `event`): las
   reglas de clase son globales ("por temporada"). En la práctica las reglas de
   clase, la NoR, las SI y las enmiendas de cualquiera de ellas **se aplican a
   una regata**. Lo permanente es el reglamento (RRS), sus apéndices y las
   enmiendas al reglamento.
2. **Pantalla.** Un único desplegable de tres capas y una sola lista
   "Accepted" mezclan cosas distintas.
3. **Parser.** `resources/ruleSections.ts` no reconoce los títulos de las
   reglas de clase de World Sailing (`A.1 LANGUAGE`, `A.1.1 …`, `C.1.1 RULES`):
   letra, punto, número. La SB20 dio 2 secciones basura (`CR 1`, `CR 2`). Fallo
   silencioso: la subida parece correcta.

## Alcance

Dentro:

- Dos grupos: **Permanentes** y **De evento**, en dos cuadros bajo "Accepted".
- Las reglas de clase pasan a ser documentos de evento (tipo propio, cita `CR`).
- Enmiendas según lo que enmiendan.
- Migración robusta de la SB20 ya subida (id 20) y de cualquier fila `class`.
- Parser: nuevo estilo de títulos con letra y punto, sin tocar los demás.
- Reindexado dirigido por versión del parser.

Fuera:

- Ejemplos (`examples/`).
- Otros documentos permanentes que hoy no están (libros de casos, de
  llamadas…): el grupo "Permanentes" admite más tipos luego; no se añade
  ninguno ahora.
- Citas ya guardadas (`case_rule_citation` guarda texto; no se reescriben).
- Borrado de una regata (los ficheros y filas FTS huérfanos de sus documentos
  de evento ya eran un hueco para NoR/SI; se anota como límite, no se
  resuelve aquí).
- `CLAUDE.md` y `constitution.md`: solo si el dueño lo ordena (D-045 sí se
  escribe).

## Modelo

| Grupo | Documento | `layer` | `doc_type` | Prefijo |
|---|---|---|---|---|
| Permanente | Reglamento (RRS), apéndices y enmiendas al reglamento | `rrs` | — | `RRS` |
| De evento | Reglas de clase | `event` | `class` | `CR` |
| De evento | NoR | `event` | `nor` | `NoR` |
| De evento | SI (IR) | `event` | `si` | `SI` |
| De evento | Enmienda de clase / NoR / SI | `event` | `class_amendment` / `nor_amendment` / `si_amendment` | el del documento enmendado |

- La capa `class` deja de usarse al subir o reclasificar (RF-001). La
  restricción `CHECK` de `layer` sigue admitiendo el literal (SQLite no la
  deja alterar); queda solo como **dato heredado** que la migración
  convierte. El `doc_type` `class` es otro concepto que comparte el literal:
  en `prefixFor`, `layer='class'` heredado se sigue resolviendo a `CR` para
  que nada citable desaparezca en silencio mientras no se migre.
- Documento de evento = una regata (`event_id`). `doc_type` no tiene `CHECK`
  (lo valida el servidor).
- Estado real hoy (verificado en la API en vivo): los documentos de París
  (ids 18 y 19) ya son `event` con `nor` / `si_amendment` desde ISS-013; el id
  20 (SB20) es `class` sin regata; el RRS (ids 10 y 11) es `rrs`.

## Requisitos

- **RF-001 Validación de capas.** Subida y reclasificar aceptan solo `layer`
  `rrs` o `event` para reglas; cualquier otro valor (incluido `class` y uno
  desconocido) da **400** con mensaje claro, no un error de `CHECK`. En
  `reclassify`, una petición de regla sin `layer` es 400 (ya no cae en `rrs`
  en silencio). Para `event`, `event_id` y un `doc_type` válido son
  obligatorios; para `rrs`, `doc_type` y `event_id` se limpian. Los dos textos
  de error de `doc_type` (`routes/resources.ts`, subida y reclasificar) se
  actualizan a la lista nueva.
- **RF-002 Tipos de evento.** `doc_type` admitidos: `class`, `nor`, `si`,
  `class_amendment`, `nor_amendment`, `si_amendment`.
- **RF-003 Prefijo.** `prefixFor` (`rules/citation.ts`, único sitio que
  construye prefijos) devuelve `CR` para `class`/`class_amendment` y para la
  capa heredada `class`; `NoR` para `nor`/`nor_amendment`; `SI` para
  `si`/`si_amendment`; `RRS` para `rrs`. Un evento sin tipo sigue dando
  `null`.
- **RF-004 Elegibilidad.** Citable por un caso: documento aceptado `rrs`, o
  `event` de la regata del caso. La capa heredada `class` **sigue siendo
  elegible** (tolerancia hasta que se migre, RF-008), para no perder reglas
  sin avisar. `ELIGIBLE_SQL` se mantiene con esa excepción documentada.
- **RF-005 Pantalla: subida.** El selector pasa de tres capas a dos:
  "Permanent (RRS, appendices and RRS amendments)" y "Event". Si es de evento,
  cada fichero en cola pide el **tipo** (Class rules / Notice of Race /
  Sailing Instructions) y una casilla **"Amendment"**; el `doc_type` se
  compone de ambos. Pide regata como hoy (la de la pestaña Case; sin regata,
  error claro).
- **RF-006 Pantalla: cuadros.** Bajo "Accepted", dos cuadros: "Permanent"
  (documentos `rrs`, más cualquier fila `class` heredada con la nota
  "legacy: assign to an event") y "Event" (documentos `event` de la regata
  elegida). Si hay documentos de otras regatas, una nota con el recuento ("N
  documents of other events not shown"). Sin regata elegida, el cuadro "Event"
  lo explica. Cada fila: título, tipo legible (p. ej. "Class rules", "SI
  amendment"), vista previa y papelera como hoy; un documento de evento sin
  tipo muestra "not classified". El cuadro "Permanent" no distingue RRS de
  enmienda al reglamento (el título basta).
- **RF-007 Pantalla: revisión y pendientes.** El formulario de reclasificar
  del documento en revisión usa el mismo selector de dos grupos (tipo +
  "Amendment" si es de evento). El valor inicial con una fila `class` heredada
  no deja el desplegable sin opción (se muestra "Event" con el tipo "Class
  rules" ya propuesto). La lista "Pending review" muestra capa y tipo legible
  de cada documento. Se mantiene el aviso "No numbered rules detected".
- **RF-008 Migración de filas `class`.** En `db/migrate.ts`, antes de indexar,
  genérica e idempotente, y **nunca interrumpe el arranque** (todo dentro de
  `try/catch` con aviso en el log):
  1. Regata destino: la única existente, o la de nombre `TEST` si hay varias;
     si no se puede decidir, **se salta con aviso** y las filas siguen como
     `class` heredadas (RF-004/RF-006 las muestran).
  2. Por fila `class`: si el `.md` está en la ruta antigua se mueve a
     `data/rules/event/` (`moveMarkdown`); si ya está en la nueva se toma tal
     cual; si no existe en ninguna, se salta con aviso.
  3. Una **sola sentencia** `UPDATE` pone `layer='event'`, `event_id`,
     `doc_type='class'`, `markdown_path` nuevo y `sections_indexed_at=NULL`
     (cumple `(layer='event') = (event_id IS NOT NULL)`).
  4. Log: una línea por documento migrado y una por cada salto
     (`Migration: class rules <id> -> event <id> (class)`).
  Sin filas `class`, no hace nada ni escribe nada. No toca citas guardadas.
- **RF-009 Parser: estilo `letra.número`.** Tercer estilo de títulos, sólo
  cuando el documento lo es:
  - Línea `^[A-Z]{1,2}\.\d+(\.\d+)*\.?\s+<texto>` (`A.1 LANGUAGE`,
    `A.1.1 The official…`, `C.1.1 RULES`); el punto tras la letra es
    obligatorio, así no choca con el estilo de tabulador del RRS (`A2`).
  - Número canónico por `canonicalNumber` (`A.1.1` → `A1.1`).
  - **Elección de estilo:** se cuentan las tres clases de línea; gana la de
    mayor cuenta. Solo se elige `letra.número` si su cuenta es **estrictamente
    mayor** que la de tabulador y la de espacio; en cualquier otro caso se
    conserva la regla actual (`espacio > tabulador ? espacio : tabulador`).
    Así el RRS, la NoR y las SI no cambian (RF-011).
  - Los subapartados (`A.1.1 The official language is English…`) son párrafos
    enteros: el título se recorta a 160 caracteres como hoy. Se acepta que
    las búsquedas por título de esos apartados sean menos finas.
- **RF-010 Parser: índices.** Solo en el estilo `letra.número`, una línea que
  termine en puntos guía y número de página (`…`, `....` o `. . .` seguidos
  de dígitos) **no** es título: no se cuenta, no crea sección y se trata como
  texto de la sección en curso. No se cubren índices sin puntos guía (límite
  aceptado). Falso positivo conocido y aceptado: una línea envuelta que
  empiece como `C.3.1 shall…`.
- **RF-011 No regresión.** Para el RRS, la NoR y las SI el resultado del
  parser es idéntico al anterior. Se comprueba con un script que compara la
  lista de secciones (número, parte, título) del parser viejo y del nuevo
  sobre los Markdown reales de `data/rules/` (RRS Parts, RRS appendix, NoR y
  SI de París).
- **RF-012 Reindexado dirigido.** Tabla nueva `app_meta(key, value)` en
  `schema.sql`. Clave `rule_index_version`: al arrancar, si falta o es menor
  que la versión del parser (`2`), se pone `sections_indexed_at = NULL` a
  todos los documentos de reglas aceptados, `indexPendingSections` los
  reindexa y se guarda la versión. Con la versión al día no reindexa nada
  (criterio 8). Las citas guardadas no se tocan; los ids de sección cambian
  (nada los guarda). Se hace **después** de la migración RF-008.
- **RF-013 Referencias tecleadas.** Las expresiones de referencias
  (`EXPLICIT_REF` en `rules/factsQuery.ts`, `RULE_REF` en `ai/complete.ts`)
  aceptan también `C.1.1` / `A.1` (letra, punto, número) para que un
  `CR C.1.1` tecleado se detecte y se avise si no existe (D-039).
- **RF-014 Documentación.** D-045 en `DECISIONS.md` (sustituye lo dicho de
  la capa `class` en D-008 y D-034: reglas de clase = tipo de documento de
  evento); notas de superada en SPEC-019 y SPEC-022 donde digan que `CR` es la
  capa `class`; `issue.md` actualizado. `CLAUDE.md` y `constitution.md` solo si
  el dueño lo ordena.

## Casos límite

- Subir un documento de evento sin regata elegida: error claro como hoy.
- Dos documentos con el mismo prefijo en una regata (p. ej. dos reglas de
  clase): sus citas pueden coincidir (`CR C1.1`); la búsqueda resuelve la más
  reciente, como ya ocurre con NoR y SI. Límite aceptado, no nuevo.
- Enmiendas que numeran distinto del documento original (`1. Amend rule…`):
  se indexan como cualquier documento numerado; que tengan sentido por
  número no está garantizado (ya era así con `si_amendment`).
- Documento mixto (varias numeraciones): decide el estilo de mayor cuenta
  (RF-009).
- Regata borrada: ver Alcance (límite).
- `Move to rules` desde ejemplos sigue creando `rrs` como hoy.
- Una restauración de copia de seguridad antigua con filas `class`: la
  migración las convierte la próxima vez que arranque.

## Decisiones tomadas por el dueño

- Solo dos grupos, permanentes y de evento, en dos cuadros bajo "Accepted".
- Reglas de clase = documento de evento, con tipo propio.
- Enmiendas al reglamento: permanentes. Enmiendas de SI (las más comunes),
  NoR y clase: de evento.
- El cuadro "Event" muestra solo la regata actual.

## Supuestos (confirmados al aceptar la spec)

- Las enmiendas de evento se suben con tipo + casilla "Amendment" y se citan
  con el prefijo del documento enmendado.
- La SB20 actual (id 20) va a la única regata existente (TEST).

## Criterios de aceptación

Local (script, sin suite):

1. El script de RF-011 da lista idéntica para RRS Parts, RRS appendix, NoR y
   SI de París con el parser viejo y el nuevo.
2. Sobre el Markdown de la SB20, el parser nuevo da **110 secciones** (medido
   en la implementación; el viejo daba 2), desde `A1` hasta `G4.1`, con `A1`,
   `A1.1`, `C1`, `C1.1`; ninguna sección `1`/`2` basura; el índice (con y sin
   puntos guía, también las entradas partidas en dos líneas) no aporta
   secciones. El propio documento numera `F.2 SPARS` y `G.2 SAIL
   SPECIFICATIONS` donde cabría `F.1` y `G.1`: se indexa tal como está
   escrito.
3. `prefixFor`, `parseCitation` y `EXPLICIT_REF` (`C.1.1`, `CR C.1.1`) pasan
   su prueba pura; la migración, sobre una copia de la BD de prueba con una
   fila `class`, la convierte; con 0 regatas o varias sin `TEST`, se salta con
   aviso y no falla; segunda ejecución no hace nada.

En vivo (producción, tras el redeploy; copia de `data/db` antes):

4. "Upload rules": selector de dos grupos y dos cuadros. RRS Parts y RRS
   appendix en Permanent; NoR y SI de París y la SB20 en Event (regata TEST).
5. La SB20 figura como "Class rules"; buscar `C.1.1` da la regla real y el
   desplegable de citas ofrece `CR C1.1`.
6. Subir (y luego borrar) un fichero de prueba de evento exige tipo; con
   "Amendment" marcado se guarda `*_amendment` y se cita con el prefijo del
   documento enmendado; uno permanente se cita `RRS …`.
7. Un caso de otra regata (si existiera) no ve el cuadro ni las reglas de
   TEST; con la pestaña Case sin regata, el cuadro Event lo explica.
8. Reiniciar el contenedor dos veces: la primera reindexa (versión del parser)
   y migra; la segunda no hace ninguna de las dos (lo dicen las líneas del
   log de `api`).
9. Sin regresión: `RRS 44.2`, `NoR Addendum D 1` y "Suggest from Facts
   Found" dan lo mismo que antes.

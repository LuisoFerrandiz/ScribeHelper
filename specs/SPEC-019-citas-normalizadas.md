# SPEC-019 — Citas de reglas con formato único y validación por capa

Estado: **reemplazada (2026-10-13)**, no implementar. El dueño explicó el
modelo real de cinco fuentes y la cadena Facts → Rules → Conclusion →
Decision; esta spec partía de citas como texto libre. Sustituta: fase F1 del
plan de replanteo (spec nueva pendiente). Se conservan como referencia el
formato canónico (`RRS`/`CR`/`NoR`/`SI`), `doc_type` y la coincidencia por
límites de token.

Origen: `issue.md` ISS-002 (decisiones del dueño del 2026-10-13).

Relacionado: `DECISIONS.md` D-004 (nada se cita si no está en el corpus
validado), D-007 (tres almacenes de material separados), D-008 (corpus
por capas con precedencia), D-009/D-020 (ingesta y revisión de
`rules/`), D-011 (FTS5, sin vectores), D-014 (`case_rule_citation`),
D-027 (adjuntos de caso). `specs/SPEC-003-documentacion-previa.md` (de
donde sale `rule_citations_candidate`, hoy sin UI).
`apps/api/src/ai/draft.ts` (`CITATION_PATTERN`, `extractCitations`,
`validateCitations`, `findExcerpt`), `apps/api/src/ai/extract.ts`
(`rule_citations_candidate`), `apps/api/src/routes/index.ts` (ruta
`rule-citations`), `apps/api/db/schema.sql` (`case_rule_citation`,
`resource`), `apps/web/src/components/CaseForm.tsx` (`handleAddRule`,
selector de corpus).

## Intención

Hoy una cita de regla es texto libre: el juez escribe `RRS 18.2(b)`,
`Rule 18.2`, `18.2` o lo que sea, y se guarda tal cual en
`case_rule_citation.rule_reference`. La IA devuelve sus propias variantes
(`RRS`/`Rule`), y la comprobación contra el corpus es una búsqueda de
subcadena que da falsos positivos (`4` "existe" si el corpus contiene
`44`). Esta spec hace que **toda cita tenga un único formato canónico**,
que **se compruebe contra la capa correcta del corpus** y que **lo que
sale de la IA se presente siempre como no verificado hasta comprobarlo**.

El humano sigue decidiendo qué se cita. La herramienta normaliza, comprueba
y avisa; no cita por su cuenta.

## Formato canónico

`<PREFIJO> <referencia>`, con un espacio, sin punto ni dos puntos.

| Prefijo | Significado | Origen en el corpus |
|---|---|---|
| `RRS` | Reglamento de Regatas a Vela (Racing Rules of Sailing) | `resource.layer = 'rrs'` |
| `CR` | Class Rule (reglas de clase) | `layer = 'class'` |
| `NoR` | Notice of Race (anuncio de regatas) | `layer = 'event'`, `doc_type = 'nor'` |
| `SI` | Sailing Instructions | `layer = 'event'`, `doc_type IN ('si', 'si_amendment')` |

Ejemplos: `RRS 44.2`, `RRS 36(b)`, `RRS C2.1`, `CR C.6.1`, `NoR 1.9`,
`SI 12`.

`referencia` conserva lo que escribió el usuario salvo espacios sobrantes
y mayúsculas del subapartado: números con puntos (`44.2`), subapartados
entre paréntesis en minúscula (`(a)`, `(b)`), letra inicial en mayúscula
para apéndices (`C2.1`, `N1.4(b)`). Fuente del patrón: las citas de
`data/phrases/base/preferred-standard-wording.md` (World Sailing),
que usan siempre `RRS` + número + subapartado.

## Alcance

**Dentro:**

1. **Normalizador único** en el backend (`apps/api/src/citations/`), una
   sola función pura reutilizada por todos los puntos de entrada. El
   frontend no duplica la lógica: muestra lo que devuelve el backend
   (lección de ISS-005, tipos duplicados que derivan).
2. **Campo `resource.doc_type`** (`nor | si | si_amendment`), solo para
   recursos con `layer = 'event'`; `NULL` en el resto. Migración
   idempotente en `migrate.ts`, como las de SPEC-016/017. Se elige al subir
   el documento (`ResourceUpload.tsx`) y se puede corregir con la ruta de
   reclasificación existente de `routes/resources.ts`.
3. **Normalizar al guardar**: `case_rule_citation.rule_reference` pasa por
   el normalizador en el servidor (ruta `rule-citations`), sea cual sea el
   cliente.
4. **Migración de las citas ya guardadas**, idempotente, con copia previa
   de la BD (ver RF-006).
5. **Validación por capa y con límites de token**, sustituyendo la
   subcadena simple de `validateCitations` y `findExcerpt` en `draft.ts`.
6. **Estado de verificación por cita** (`verificada`, `no encontrada`,
   `sin clasificar`, `sin corpus cargado`), calculado al leer el caso, no
   guardado, y mostrado en "Rules Applicable".
7. **Extracción de formularios de protesta** (`extract.ts`): el prompt pide
   el formato canónico, el servidor normaliza y valida cada
   `rule_citations_candidate`, y la UI de Rules Applicable los ofrece
   etiquetados **"alegada por la parte"**, sin insertarse sola.
8. **Panel de borrador IA** (`draft.ts`): el patrón reconoce los cuatro
   prefijos; el prompt exige copiar las citas del caso tal cual; toda cita
   del texto generado que no esté en la lista del caso se marca.

**Fuera de esta spec:**
- `conclusion_candidate` / `decision_candidate` (ISS-007, aplazado).
- Refactor de `CaseForm.tsx` (ISS-006).
- Reescribir el texto que genera la IA (no se sustituyen palabras dentro de
  los párrafos del borrador; solo se marcan las citas dudosas).
- Citas a Cases, Calls o apelaciones nacionales (capa 5 de `CLAUDE.md`,
  interpretativas, no prescriptivas). No tienen prefijo en esta spec.
- Cualquier cambio en cómo se ingiere o revisa el corpus.

## Requisitos funcionales

- **RF-001 — Una función, un formato.** Existe una función
  `normalizeCitation(texto)` que devuelve `{ prefix, reference, canonical }`
  o `{ unclassified: true, original }`. Todos los puntos de entrada la
  usan; no hay otra lógica de formato en el código.
- **RF-002 — Casos de normalización.** Como mínimo:

  | Entrada | Resultado |
  |---|---|
  | `RRS 44.2` | `RRS 44.2` |
  | `rrs 44.2`, `Rule 44.2`, `rule 44.2`, `R. 44.2`, `44.2` | `RRS 44.2` |
  | `RRS  36 ( B )` | `RRS 36(b)` |
  | `RRS c2.1` | `RRS C2.1` |
  | `CR C.6.1`, `Class Rule C.6.1`, `class rules C.6.1` | `CR C.6.1` |
  | `NoR 1.9`, `NOR 1.9`, `Notice of Race 1.9` | `NoR 1.9` |
  | `SI 12`, `SIs 12`, `Sailing Instructions 12` | `SI 12` |
  | `C.6.1` sin prefijo (no tiene forma de regla RRS) | sin clasificar |
  | `texto cualquiera` | sin clasificar |

  Sin prefijo, solo se asume `RRS` si la referencia tiene forma de regla
  RRS (`44`, `44.2`, `36(b)`, `C2.1`). Si no, se marca sin clasificar y
  **no se adivina**.
- **RF-003 — Se guarda lo normalizado.** Añadir una cita guarda siempre
  la forma canónica. Si no se puede clasificar, se guarda tal cual el
  usuario la escribió, marcada como sin clasificar, y se le avisa en
  pantalla. No se rechaza el guardado (decide el humano, ver pregunta
  abierta 1).
- **RF-004 — Prefijo según el documento.** Los prefijos se derivan de la
  capa (`rrs`→`RRS`, `class`→`CR`) y de `doc_type` (`nor`→`NoR`,
  `si`/`si_amendment`→`SI`). Un recurso `event` sin `doc_type` queda como
  "sin clasificar" y la UI de subida/gestión de reglas lo señala.
- **RF-005 — `doc_type` obligatorio al subir una regla de evento.** Subir
  una regla con `layer = 'event'` exige elegir `nor`, `si` o `si_amendment`;
  para `rrs`/`class` el campo no se muestra y se guarda `NULL`. La ruta de
  reclasificación acepta cambiarlo. Restricción de integridad: `doc_type`
  distinto de `NULL` solo si `layer = 'event'`.
- **RF-006 — Migración de citas existentes, sin pérdida.**
  - Antes de tocar nada: copia del fichero SQLite en `data/db/` con nombre
    fechado (`*.bak-spec019-AAAAMMDD`). Si la copia falla, la migración no
    corre.
  - Reescribe solo las filas que el normalizador clasifica. Las que no,
    se dejan intactas y se listan en el log del arranque.
  - Idempotente: una segunda ejecución no cambia nada.
  - No se ejecuta sola en el entorno desplegado sin que el dueño sepa que
    llega con el redeploy (ver "Riesgos").
- **RF-007 — Validación por capa.** Una cita `RRS …` se comprueba solo
  contra recursos `rule` aceptados con `layer = 'rrs'`; `CR` contra
  `class`; `NoR`/`SI` contra los de `layer = 'event'` del **evento del
  caso** y su `doc_type`. Estados:
  - `verificada`: la referencia aparece en el corpus de su capa.
  - `no encontrada`: hay corpus de esa capa y la referencia no aparece.
  - `sin corpus cargado`: no hay recurso aceptado de esa capa.
  - `sin clasificar`: no se pudo determinar el prefijo.
- **RF-008 — Coincidencia con límites de token.** Una referencia aparece
  en el corpus solo si no va precedida de letra, dígito o `.`, y no la
  sigue una letra o un dígito. `4` no coincide con `44` ni con `142`;
  `42.1` no coincide con `142.1`. Sí coincide `44` con `44.1`
  (jerarquía: si existe `44.1`, existe la regla 44) y `44.2` con
  `44.2(a)`. Esta función sustituye a la subcadena simple en
  `validateCitations` **y** en `findExcerpt`.
- **RF-009 — Mostrar el estado.** En "Rules Applicable", cada cita
  muestra su estado: sin marca si está verificada; aviso visible si es
  `no encontrada`, `sin corpus cargado` o `sin clasificar`, con texto
  claro de por qué. La marca no bloquea ni oculta la cita.
- **RF-010 — Candidatas del formulario de protesta.**
  `rule_citations_candidate` se normaliza y valida en el servidor y se
  devuelve con su estado. En Rules Applicable aparecen como lista
  separada **"Alegadas en el formulario de protesta"**, con el estado de
  verificación, que el juez añade con un clic. Nunca se insertan solas y
  nunca se presentan como regla aplicable.
- **RF-011 — Prompt de extracción.** `extract.ts` instruye el formato
  canónico y aclara que se transcribe lo que alega la parte, sin añadir
  reglas que el formulario no mencione.
- **RF-012 — Borrador IA.** `CITATION_PATTERN` reconoce `RRS`, `CR`, `NoR`
  y `SI` (y las variantes `Rule`/`rule` como RRS). El prompt dice que se
  copien las citas de "Rules already cited for this case" **idénticas, con
  su prefijo**. Toda cita del texto generado que no esté en esa lista, o
  cuya validación falle, se devuelve marcada en `CitationCheck`.
- **RF-013 — Sin regresión.** El selector de corpus (`rule-picker`) sigue
  funcionando; al elegir un hallazgo se añade la cita ya con prefijo
  canónico. Los demás botones "Remove" y el panel de borrador conservan su
  comportamiento actual salvo lo descrito aquí.

## Decisiones técnicas propuestas

- **Normalizar en el servidor**, no en el cliente: el servidor es el único
  punto por el que pasan formulario, selector, IA y migración. Un solo
  código, sin copia en `apps/web` (evita repetir ISS-005).
- **Estado de verificación calculado, no guardado**: depende del corpus,
  que cambia (se sube una enmienda, se rechaza un documento). Guardarlo
  dejaría datos viejos. Se calcula al leer el caso.
- **Coincidencia por límites en vez de FTS5 MATCH**: la referencia lleva
  puntuación que parte el tokenizador de FTS5 (mismo motivo que ya
  documenta `draft.ts`). Se mantiene la búsqueda sobre el Markdown
  convertido, con expresión regular de límites.
- **`doc_type` como columna aditiva**, no un cuarto valor de `layer`:
  `layer` mantiene la precedencia del RRS (capas 1-4 de `CLAUDE.md`);
  cambiarlo obligaría a recrear la tabla `resource` por su `CHECK`.
  `doc_type` con `CHECK (doc_type IN ('nor','si','si_amendment'))` y
  validación de acoplamiento con `layer` en la API.
- **Entrada nueva en `DECISIONS.md`** al implementar: prefijos, `doc_type`,
  validación por capa y estados.

## Preguntas abiertas (necesitan al dueño)

1. **¿Avisar o bloquear?** Propuesta: **avisar, no bloquear**. D-004 dice
   "nada se cita si no está en el corpus validado", pero hoy el corpus
   puede estar incompleto (un PDF mal convertido, una enmienda aún sin
   subir) y la decisión es del juez. Bloquear obligaría a subir el
   documento antes de poder citar. La alternativa estricta es bloquear
   las `no encontrada`.
2. **Enmiendas a las SI.** ¿`SI 12` valida contra la SI original y las
   enmiendas a la vez, o hace falta citar la enmienda aparte (`SI 12`
   frente a `SI-Am 12`)? Propuesta: un solo prefijo `SI`, validado contra
   el conjunto.
3. **Recursos `event` ya subidos**: quedan sin `doc_type`. ¿Los
   clasificas tú tras el despliegue (propuesta) o la migración los marca
   como `si` por defecto?
4. **Referencias a definiciones y partes** (`RRS Definition: Mark-Room`,
   `RRS Part 2`, `RRS Appendix B`): ¿entran en el formato o se dejan como
   sin clasificar de momento? Propuesta: sin clasificar, otra spec.

## Riesgos

- **Cambio de datos en producción.** La migración reescribe filas de
  `case_rule_citation` en la BD desplegada. Mitigación: copia previa
  (RF-006), solo filas clasificables, idempotente, y aviso al dueño antes
  del redeploy.
- **Falsos positivos residuales.** Los límites de token reducen pero no
  eliminan la coincidencia accidental (un `44` en una fecha o en un número
  de página del corpus). La cita aparecería `verificada` sin ser una
  regla. Mitigación posible, no incluida: restringir a encabezados o
  inicio de línea. Se deja como mejora si el dueño la ve en uso real.
- **Falsos negativos por mala conversión** de PDF a Markdown: una regla
  que existe y no se encuentra. Por eso el aviso no bloquea.
- **`CaseForm.tsx` ya concentra demasiada lógica** (ISS-006). Los cambios
  de UI se limitan a lo mínimo: estado por cita y lista de candidatas.

## Verificación

El proyecto no tiene suite de tests (`constitution.md` → Calidad). Se
verifica así:

1. `npm run build` en `apps/api` y `npm run typecheck` en `apps/web`
   limpios.
2. Script desechable (fuera del repo) que ejecute el normalizador contra la
   tabla de RF-002 y contra los casos de límites de RF-008 (`4` vs `44`,
   `42.1` vs `142.1`, `44` vs `44.1`).
3. Verificación en vivo en `http://192.168.1.105:8086/` tras el redeploy:
   - añadir `Rule 44.2` y `rrs 36 (b)` y comprobar que se guardan como
     `RRS 44.2` y `RRS 36(b)`;
   - subir una SI y una NoR con `doc_type` y citar `SI` y `NoR`;
   - citar una regla inexistente y ver el aviso;
   - subir un formulario de protesta y comprobar la lista "alegadas";
   - generar un borrador y comprobar que las citas llevan prefijo y que las
     ajenas a la lista se marcan;
   - revisar el log de arranque de la migración y comparar el antes y el
     después con la copia de la BD.
4. Redeploy por Portainer y reconfirmación en producción, según la
   definición de terminado de `CLAUDE.md`.

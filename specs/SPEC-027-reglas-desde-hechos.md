# SPEC-027 — Reglas sugeridas desde Facts Found

Fase F5 (`issue.md`, plan de cinco fuentes). Estado: v2 (tras `reviewer`: sin
bloqueantes duros, 3 importantes y el resto recogidos).

## Problema

En Rules Applicable el juez tiene que saber qué regla buscar. El modelo real
de trabajo es hechos + reglamento: de lo que se probó en Facts Found salen las
reglas candidatas. Hoy el buscador solo responde a lo que se teclea.

## Alcance

Una sugerencia **determinista** (sin IA, sin red, sin coste): búsqueda de
texto completo (FTS5) en el índice por regla de SPEC-022 (`rule_section`,
sin cambios de esquema), usando el texto de Facts Found como consulta. Nada
se inserta ni se cita sin un clic en "Add" (constitución, D-004): se reutiliza
el Add validado de SPEC-022.

Fuera: IA que razone qué regla aplica (otra fase), hearing notes y formulario
de protesta como fuente (solo Facts Found, lo probado), desfase entre cajas
(F6).

Ensayo previo (script desechable sobre el corpus real, 4 textos de ejemplo):
salen las reglas esperadas (16.2, 18.2, 42.2, 21.1…) pero con ruido: las
variantes de apéndice (Appendix C 18.2…) superan a la regla principal y una
regla corta y central (la 10) puede quedar fuera. Es una **ayuda aproximada**,
no un veredicto: el aviso de RF-007 lo dice.

## Requisitos

- **RF-001 Ruta** `POST /rules/suggest` con `{ case_id, text }` (texto de la
  caja *en pantalla*, guardado o no), registrada en `registerRuleSearchRoute`
  (la autenticación es el hook global). `text` no string → 400; `case_id`
  ausente o inexistente → solo RRS y clase (`eventIdOfCase` devuelve null).
  Elegibilidad idéntica a `/rules/search` (`ELIGIBLE_SQL`). Respuesta
  `{ hits, otherEvents }` (misma forma que `/rules/search`; `otherEvents`
  siempre `false` aquí). `text` se recorta a 8000 caracteres.
- **RF-002 Consulta** Términos: palabras de ≥3 letras, minúsculas, sin
  repetidos, máximo 30, sin palabras vacías **ni vocabulario omnipresente de
  regata** (`boat`, `boats`, `race`, `rule`, `rules`, `sailing`, `sailed`). Cada
  término se reduce quitando `-ing`, `-ed`, `-es`, `-s` si queda ≥4 letras y se
  busca como **prefijo** (`"tack"*`), porque los hechos van en pasado y las
  reglas en presente y el índice no tiene stemming. Términos entre comillas y
  unidos con `OR`; ningún operador de FTS llega como sintaxis (se descartan las
  comillas del texto). Orden `bm25(rule_section_fts, 5.0, 1.0)`: el
  encabezado pesa 5 veces el cuerpo. Se piden 50 candidatos al FTS antes de
  filtrar (RF-004). Una consulta que FTS5 rechace → `{ hits: [] }`, no 500.
- **RF-003 Referencias explícitas** Una regex previa extrae del texto los
  fragmentos tipo `RRS 18.2`, `rule 14`, `NoR 1.9`, `SI 12` (prefijo
  **en mayúsculas** salvo `rule`/`Rule`; número con sufijos opcionales `(a)`;
  sin punto final) y cada uno se resuelve con
  `parseCitation`/`sectionsForCitation`. Sus secciones salen **primero**, en el
  orden en que aparecen en el texto, antes de los resultados por palabras.
  Quedan fuera por diseño: un número sin prefijo ("42.2"), listas ("rules 14
  and 15" solo resuelve la 14) y variantes de apéndice. Cuentan para el tope
  de RF-005 y, si ya están citadas, salen marcadas igual.
- **RF-004 Orden y apéndices del RRS/clase** Una sección con `part` que
  empieza por `Appendix` (de RRS o clase) se coloca **después** de las
  principales (`part` nulo u otras partes, como `Addendum E` de una SI) y se
  descarta si hay otra sección con el mismo (capa, número) sin apéndice entre
  los candidatos. Las secciones nativas de apéndice (`A2.1`) tienen número
  propio y no se dedupen. NoR/SI no se mezclan con el RRS en la dedupe (capa
  distinta).
- **RF-005 Tope y citadas** Máximo 8 resultados tras ordenar y deduplicar
  (explícitas primero). Las ya citadas en el caso salen marcadas ("Already
  cited") y ocupan hueco; no se ocultan.
- **RF-006 UI** En `RulesSuggestions`, botón **"Suggest from Facts Found"**,
  desactivado si Facts Found está vacío. Al pulsar llama a la ruta con el texto
  en pantalla y muestra la lista con el mismo renderizado y botón **Add** que
  el buscador (componente `RuleHitList` compartido; se conservan `can_add` y
  el aviso "Classify this document first"). Estados: "Searching…", "No rules
  matched the Facts Found text." y error de servidor visible.
  Cambiar Facts Found no repite la búsqueda; el botón se pulsa de nuevo.
  **Tras un Add** (cambia `citationsKey`) la lista se vuelve a pedir con el
  último texto enviado, para que la regla pase a "Already cited". Se descarta
  la respuesta de una petición vieja (patrón `cancelled` de `RulePicker`:
  doble clic, cambio de caso).
- **RF-007** Ayuda: "Keyword match against the loaded rules; you decide which
  apply." Sin sección ni etiqueta de origen. Snippet: el encabezado de la
  regla (las coincidencias resaltadas con 30 términos no ayudan).
- **RF-008** Sin migración ni cambios de esquema.
- **RF-009** Tipos web: `RuleSearchResult` se reutiliza tal cual (`otherEvents`
  incluido).

## Criterios de aceptación (verificación en vivo, TEST-02)

1. Con hechos de babor/estribor aparecen 16.2 / 18.x y no se repiten variantes
   de apéndice con la regla principal presente; las secciones de apéndice, si
   salen, van detrás.
2. "RRS 14" escrito en los hechos pone la 14 arriba.
3. Add funciona desde la sugerencia (registra y escribe en la caja); la regla
   pasa a "Already cited" sin pulsar el botón otra vez.
4. Facts Found vacío: botón desactivado. Sin coincidencias: mensaje.
5. Texto sin guardar se usa (no hace falta Save).
6. Un caso de otro evento no ve NoR/SI de este evento.
7. Texto con comillas, `NEAR(`, `*` o 20 000 caracteres: respuesta sin error.

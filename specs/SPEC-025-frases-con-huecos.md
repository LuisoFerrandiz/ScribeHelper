# SPEC-025 — Frases con huecos: relleno con Tab, inserción al cursor y texto fantasma de frases

Estado: draft v2 (2026-10-14). Fase F3 del replanteo de `issue.md`. v2
incorpora la revisión del subagente `reviewer` (5 bloqueos, 8 importantes) y
las decisiones del dueño del 2026-10-14. Pendiente de plan/tasks y de
implementación.

Relacionado: `CLAUDE.md` (dos tipos de frase: fija y con huecos; "la
aplicación debe saber dónde colocar el cursor"), D-022 (frases base),
D-025 (texto fantasma), D-028 (UX sin lógica en el componente), D-030 (lista
única de sugerencias), SPEC-020 (`SuggestionList`), SPEC-024 (`WritingBox`),
`constitution.md` (nada se inserta solo; lo determinista antes que la IA;
offline primero).
`apps/web/src/components/{GhostTextarea,SuggestionList,WritingBox,CaseForm}.tsx`,
`apps/web/src/api.ts` (`listPhrases`), `apps/api/db/schema.sql` (tabla `phrase`).

## Intención

Las frases de la librería traen huecos entre corchetes pensados para
rellenarse (`[##]`, `[injury]`, `[X] [Y]`, `[insert name]`). Hoy se insertan
**literales y al final del cuadro**, y el juez tiene que localizar y borrar
cada corchete a mano. El dueño quiere que la aplicación sepa dónde están los
huecos, que los recorra con Tab, que inserte donde está el cursor, que las
partes X e Y se resuelvan en un clic con los barcos del caso, y que el texto
fantasma proponga frases de la librería (determinista, sin IA) antes de
llamar al modelo.

## Hechos verificados (2026-10-14, base de producción copiada, revisados por el `reviewer`)

- `phrase`: 333 filas, todas `origin = 'base'` (0 propias): 246
  `conclusion`, 53 `decision`, 31 `procedural_matters`, 3 `facts_found`.
  Columnas `id, box, label, body, origin, created_at`.
- **160 frases (48 %)** contienen corchetes. Fichas más repetidas: `[##]` 36,
  `[Y]` 19, `[injury]` 15, `[X]` 14, `[serious damage]` 11, `[race ##]` 9.
  Hueco más largo: 181 caracteres. Ningún corchete cruza un salto de línea.
  7 frases usan `\r\n`; 42 llevan NBSP (ninguno dentro de corchetes).
- 240 pares `] [` (alternativas como `[injury] [serious damage]`, o las dos
  partes `[X] [Y]`) y 16 pares pegados sin espacio (`[X][Y]`,
  `[change course][change…]`). 3 frases (77, 80, 82) tienen corchetes separados
  por `\r\n`.
- 9 frases con corchetes anidados (`[… [Y] [she] …]`), 4 con un `[` sin
  cerrar (ids 135, 244, 245, 261) y 2 con un `]` sobrante (21, 168).
- X e Y aparecen **sueltas** (sin corchetes) en 185 de las 333 frases (343
  apariciones): `inform X at the first reasonable opportunity`, `Y on port`,
  `Y’s request`. Son etiquetas genéricas de las partes, no un mapeo fijo
  iniciador/respondido. Hay frases que empiezan por `X` o `Y` (64).
- Hay alternativas entre paréntesis (`(injury) (physical damage)`, 28 frases
  con paréntesis dentro de corchetes) que **no** son hueco (chocan con citas
  como `RRS 63.7(a)(1)`).
- `GhostTextarea.tsx` es un `<textarea>` simple con un `<div>` espejo detrás.
  El fantasma hoy sale de (1) el número de vela con su rol (síncrono) o
  (2) la IA (`/cases/:id/complete`, debounce 900 ms, mínimo 15 caracteres), y
  solo se muestra con el cursor al final del texto. **No existe**
  autocompletado determinista por prefijo contra la librería.
- `GhostTextarea` se usa también en Rules Applicable (`box="rules_applicable"`).
- `SuggestionList.onInsert(text)` entrega el texto; `CaseForm` lo añade **al
  final** con `\n\n` en las cuatro cajas con librería (Procedural, Facts,
  Conclusion, Decision) y con `\n` en Rules Applicable (no cambia).
- Un `<textarea>` normaliza su `.value` a `\n`: los offsets de `selectionStart`
  y de cualquier texto insertado deben calcularse sobre texto con `\n`.

## Alcance

**Dentro:** (1) lenguaje de huecos y su análisis (función pura);
(2) inserción de una frase de la librería **en el cursor**; (3) recorrido de
huecos con Tab y Shift+Tab; (4) barra de partes para X e Y con los barcos del
caso; (5) texto fantasma de frases por prefijo, determinista y en el cliente,
antes de la IA, con la misma mecánica de huecos al aceptarlo.

**Fuera:** la IA que rellena huecos o redacta lo que las frases no dicen (F4);
edición de frases existentes; Rules Applicable (no usa la librería, D-032);
relleno automático de `[##]`, `[race ##]`, `[date]` u otros (se recorren con
Tab y se escriben); alternativas entre paréntesis; avisos de huecos sin
rellenar al copiar o descargar (F6); cambios en el esquema de `phrase`.

## Definiciones

- **Corchete equilibrado:** un `[` con su `]` pareja contando anidamiento. Se
  busca desde cada `[` en orden: si no tiene pareja, es **texto normal** y la
  búsqueda sigue en el carácter siguiente. Un `]` sin `[` es texto normal.
- **Hueco:** un corchete equilibrado del nivel exterior (los anidados van
  dentro). **Cada corchete es un hueco propio, aunque estén pegados**
  (`[injury] [serious damage]` son dos huecos: el escribano deja o borra la
  opción que corresponda según el caso). Los corchetes que contienen
  exactamente `X` o `Y` no son huecos: son **etiquetas de parte** (abajo).
- **Etiqueta de parte:** la ficha `X` o `Y` como palabra suelta (sin letra,
  dígito, guion ni punto-más-letra pegados; el posesivo `Y’s` cuenta y `X.` al
  final de frase cuenta) **fuera de un hueco**, o un corchete cuyo contenido
  recortado es exactamente `X` o `Y` (`[X]`, `[ Y ]`). Dos etiquetas
  `[X]`/`[Y]` pegadas (solo espacios entre ellas, `[X] [Y]`, `[X][Y]`) forman
  **un grupo de partes**, y se sustituyen juntas. `Z` no es etiqueta de
  parte. Una X o Y dentro de un hueco (`[X / Y]`, `[insert role, e.g. coach of
  X or Y]`, `[an action of [X] [Z] …]`) pertenece a ese hueco, no es etiqueta.
- **Zona:** el rango de texto que se insertó (o aceptó del fantasma) y sobre el
  que actúa la sesión.

## Requisitos funcionales

- **RF-001 — Análisis (función pura, sin red).** `phraseGaps(text)` devuelve
  `{ gaps: {start,end}[], parties: {start,end,label:'X'|'Y'|'XY'}[] }`
  ordenados, con las definiciones de arriba. Es el único código que decide
  qué es un hueco o una etiqueta de parte. Trabaja sobre texto con `\n`.
  La verificación fija el resultado esperado por frase para los casos
  conflictivos (ids 21, 52, 135, 146, 168, 210, 244, 245, 247, 261).
- **RF-002 — Inserción al cursor.** Un clic en una **frase de la librería** de
  la lista de sugerencias de las cuatro cajas con librería inserta el texto
  **en el cursor**; con texto seleccionado, lo sustituye. Si el cuadro nunca
  ha tenido el foco desde que se montó, o el cursor está al final del texto,
  se mantiene lo de hoy (se añade al final, con `\n\n` si el texto no está
  vacío). En medio del texto se inserta tal cual, sin espacios ni saltos
  añadidos. El texto insertado se normaliza `\r\n` → `\n`. Tras insertar el
  cuadro recupera el foco. Las demás sugerencias (formulario de protesta,
  notas, ejemplos) siguen añadiéndose al final como hoy y **no** abren sesión.
  Rules Applicable no cambia. Los botones de la lista y de la barra de partes
  no quitan el foco al cuadro (`mousedown` sin acción por defecto).
- **RF-003 — Recorrido con Tab.** Si la frase insertada (o aceptada del
  fantasma, RF-007) contiene huecos, se abre una **sesión** sobre la zona: el
  primer hueco queda **seleccionado** (escribir lo sustituye; Supr lo borra).
  `Tab` selecciona el siguiente; `Shift+Tab`, el anterior. En el último
  hueco, `Tab` coloca el cursor al final de la zona y cierra la sesión.
  La sesión se cierra con `Escape`, con un clic dentro del cuadro, al perder el
  foco hacia fuera de la propia sección (la lista de sugerencias y la barra de
  partes no cuentan, RF-002) o al empezar otra sesión. Fuera de una sesión,
  `Tab` hace lo de siempre (sale del cuadro). Frase sin huecos: sin sesión;
  si solo tiene etiquetas de parte, no hay parada de Tab pero sí barra
  (RF-005). Tras seleccionar, el hueco se muestra a la vista (el cuadro hace
  scroll hasta él; los huecos de más de 100 caracteres se seleccionan igual).
  Un texto breve bajo el cuadro, "Tab: next gap · Shift+Tab: previous ·
  Esc: stop", indica que la sesión está activa.
- **RF-004 — Seguimiento de la sesión.** La zona se mantiene mientras el
  usuario escribe: una edición dentro de la zona ajusta su final por la
  diferencia de longitud; antes de la zona, la desplaza; después, no la
  afecta. El rango editado se infiere de la posición del cursor tras el
  cambio y de la diferencia de longitud. Pegar, deshacer, cortar y una edición
  que cruza el borde de la zona **cierran** la sesión. Los huecos se recalculan
  sobre el texto actual de la zona en cada `Tab` (RF-001); no se guardan
  posiciones de huecos. Limitación anotada: la inserción por la aplicación no
  entra en el historial de deshacer del navegador.
- **RF-005 — Barra de partes.** Mientras la zona contenga etiquetas de parte,
  haya sesión abierta y el caso tenga barcos, bajo el cuadro aparece una
  barra con una fila por letra presente en la zona: "Replace X with:"
  y "Replace Y with:", y un botón por barco del caso (número de vela y su rol
  iniciador/respondido). Un clic sustituye **todas** las apariciones de esa
  letra en la zona por el número de vela (el grupo `[X] [Y]` se sustituye
  entero por el barco elegido en cualquiera de las dos filas). La barra no
  asume nada: ninguna parte se rellena sin un clic. Sin barcos en el caso no hay
  barra y X/Y se escriben a mano. Sin Tab de por medio: X/Y nunca son paradas.
- **RF-006 — Lista sin cambios visibles.** La lista sigue mostrando el texto
  de cada frase tal cual (con corchetes); no hay etiquetas de origen (D-030).
- **RF-007 — Texto fantasma de frases (determinista, en el cliente).** En las
  cuatro cajas con librería, con el cursor al final, el fantasma propone
  primero **el resto de una frase de la librería** cuyo cuerpo (con `\r\n` →
  `\n`, NBSP → espacio) empieza, sin distinguir mayúsculas, por el **último
  párrafo** escrito (texto tras el último salto de línea doble) si éste tiene
  al menos 12 caracteres y la frase es **estrictamente más larga**. Entre
  varias, la más corta; a igual longitud, la de menor `id`. El resto sale con
  la capitalización de la frase y detrás del texto ya escrito (que no se
  cambia). Las frases de la caja se cargan **una vez** por caja (`listPhrases`,
  caché en el cuadro, se recarga si el usuario guarda una frase). Sin
  llamada de red por pulsación; si la carga falla, se sigue con la IA como hoy.
  Orden de fuentes: número de vela con rol → frase de la librería → IA (como
  hoy, mínimo 15 caracteres, solo si no hubo frase). `Tab` acepta el resto;
  `Escape`, un clic o escribir lo descartan. Aceptar abre sesión (RF-003) sobre
  **el resto aceptado**, no sobre lo ya escrito. Rules Applicable no usa
  frases: el cuadro recibe qué caja es y la desactiva por una propiedad
  explícita.
- **RF-008 — Sin ruta nueva.** No se crea ninguna ruta de API: la comparación
  por prefijo es del cliente. (Sustituye al `GET /phrases/complete` de v1,
  que obligaba a una llamada por pulsación y no era offline.)
- **RF-009 — Guardar frase con huecos.** "Save current text as phrase" no
  cambia; el texto guardado puede llevar corchetes y se comportará como
  cualquier frase. Texto de ayuda junto al botón: "Use [brackets] for gaps
  and X / Y for the parties."
- **RF-010 — Sin efectos fuera de lo clicado.** Nada se inserta sin un clic o
  un `Tab` de aceptación (constitución). Los huecos sin rellenar **no** se
  avisan al copiar ni al descargar: un `[##]` puede llegar al documento final.
  Es un fallo silencioso conocido; se registra en `DECISIONS.md` y se aborda en
  F6 (aviso de huecos pendientes).
- **RF-011 — Textos en inglés** (constitución): "Tab: next gap · Shift+Tab:
  previous · Esc: stop", "Replace X with:", "Replace Y with:",
  "Use [brackets] for gaps and X / Y for the parties.", y los botones con el
  número de vela y "(initiator)"/"(respondent)".
- **RF-012 — Contrato.** `GhostTextarea` expone un manejador imperativo
  (`insertAtCaret(text)`, solo para frases de la librería) y gestiona la sesión
  y la barra; `CaseForm` guarda una referencia por caja con librería y la
  pasa a `SuggestionList` (`onInsertPhrase`). `WritingBox` no cambia de
  contrato (recibe el `textarea` ya construido y el `side`).

## Decisiones del dueño (2026-10-14)

1. **Rellenar con Tab entre huecos** (no formulario previo ni solo inserción
   literal).
2. **X e Y con barra de partes de un clic** (sin asumir iniciador/respondido
   ni paradas de Tab para cada X/Y).
3. **Hueco = solo corchetes equilibrados**; los paréntesis son texto.
4. **Alcance: lista y texto fantasma de frases.**
5. **Alternativas pegadas = un hueco por corchete** (`[injury] [serious
   damage]` son dos huecos: se borra o se deja cada opción según el caso).

## Riesgos

- **Selección en un `<textarea>` controlado de React:** hay que aplicar
  `setSelectionRange` tras el render del valor nuevo (efecto de layout) y,
  para llevar el hueco a la vista, enfocar de nuevo tras fijar la selección.
- **Tab secuestrado:** solo dentro de una sesión (visible), con `Escape` como
  salida; no rompe la navegación por teclado fuera de ella.
- **Pérdida de foco por los botones:** se evita con `mousedown` sin acción por
  defecto en la lista y la barra.
- **Fantasma de frases poco útil:** frases que empiezan por X/Y casi nunca
  coinciden con lo tecleado (se sustituyen por números de vela); el valor está
  en empezar un párrafo con una frase estándar (`The hearing was…`, `Since…`).
  Se mide en la verificación en vivo; si no ayuda, se ajusta el mínimo.
- **Frases base mal formadas** (4 con `[` sin cerrar, 2 con `]` sobrante, 9
  anidadas): reglas de RF-001; quedan editables a mano.
- **Deshacer:** una inserción de la aplicación no se deshace con Ctrl+Z.
- **Huecos que llegan al documento final** (RF-010).

## Verificación

1. `npm run typecheck`/`build` (web y api) limpios.
2. Script desechable sobre `phraseGaps` con las 333 frases base: número de
   huecos y de partes por frase; casos esperados explícitos para los ids 21, 52,
   135, 146, 168, 210, 244, 245, 247, 261, 29, 30, 71, 77; `[injury] [serious
   damage]` = 2 huecos; `[X] [Y]` = un grupo de partes; `[X][Y]` igual; `[an
   action of [X] [Z] …]` = 1 hueco sin parte; `Y’s`; `X.` al final de frase;
   `Appendix X` y `X-ray` sin partes; `Z` no; `RRS 63.7(a)(1)` sin huecos;
   `\r\n` normalizado.
3. En vivo (TEST-02): insertar una frase en medio del texto, al final y con
   selección; Tab y Shift+Tab; escribir en un hueco y seguir; borrar un hueco
   con Supr; barra de partes con dos barcos, con uno y con ninguno; Escape;
   Tab fuera de sesión; hueco largo a la vista; fantasma por prefijo y Tab;
   sin frase, la IA como hoy; Rules Applicable sin cambios; cambiar de pestaña
   y volver; las cuatro cajas se comportan igual.

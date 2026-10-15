# SPEC-032 — Postura de parte del formulario de protesta

> **Nota (2026-10-15):** SPEC-034 (D-046) retira la tarjeta insertable "Party claim — not
> final" y su etiqueta: la postura de parte ya no se ofrece como sugerencia. Se mantiene
> la extracción `party_position`, su uso como contexto de solo lectura del texto fantasma y el
> filtro `citesDisallowedRule` del servidor. La postura de la parte nunca es fuente de las
> propuestas.

Levanta el aplazamiento de `issue.md` ISS-007 y lo cierra al terminar. Estado:
v2 (tras `reviewer`: 2 bloqueantes y varios importantes recogidos; el dueño
decidió filtro de reglas en servidor y etiqueta visible).

## Problema

La extracción del formulario de protesta (`ai/extract.ts`) tiene dos campos,
`conclusion_candidate` y `decision_candidate`, con un prompt que los trata como
"casi siempre vacíos; rellénalos solo si el formulario ya documenta una
conclusión o decisión". Ese modelo es falso. Un formulario de protesta **nunca**
trae la conclusión ni la decisión finales: las toma el comité tras la audiencia.
Lo que sí puede traer es la **postura de una parte**: qué sostiene que pasó y
qué regla cree rota (su conclusión), y qué pide (su decisión, p. ej. descalificar
al otro barco). El comité puede asumirla o no. Esa postura sirve como contexto,
pero hoy casi nunca se rellena y la IA del texto fantasma no ve nada del
formulario.

## Alcance

Convertir los dos campos en una **postura de parte** explícita, atribuida y
marcada como "no final", y usarla de dos formas:

1. **Sugerencia de un clic** en Conclusion y Decision, con etiqueta visible.
2. **Contexto de lectura** del texto fantasma de IA, solo en Conclusion y
   Decision, con un filtro determinista de reglas.

Fuera de alcance:

- `NotesExtraction` (hearing notes) y su prompt: sin cambios. Cuidado al
  renombrar: `extractNotes.ts` y `NotesExtraction` usan los mismos nombres.
- `rule_citations_candidate` y `facts_found_candidate(s)`. Las reglas que
  nombre una postura **no** alimentan el registro de citas.
- Guardar la extracción en la base de datos (sigue siendo solo de sesión).
- El panel de borrador (`draft.ts`, sin montar desde SPEC-020).

## Requisitos

- **RF-001 Forma de datos.** `AttachmentExtraction` sustituye
  `conclusion_candidate` y `decision_candidate` por
  `party_position: { initiator?: PartyPosition; respondent?: PartyPosition }`,
  con `PartyPosition = { conclusion?: string; decision?: string }`. Mismas
  claves en `apps/api/src/ai/extract.ts` y `apps/web/src/types.ts` (copias a
  mano; `tsc` no detecta deriva). En el cliente `party_position` es **opcional**
  en el tipo (tolera un API o un bundle de la versión anterior).
- **RF-002 Significado.** `conclusion`: lo que esa parte sostiene que ocurrió
  y qué regla cree rota. `decision`: lo que esa parte pide al comité. Ninguna es
  un hallazgo ni una resolución del comité.
- **RF-003 Quién.** `initiator` es quien presenta la protesta; `respondent` es
  el protestado, solo si el formulario recoge su postura (formulario de
  respuesta, declaración). Si no está claro de qué parte es el texto, se omite.
  Una parte sin ningún texto no aparece. Terminología del producto:
  `initiator` / `respondent` en datos, "Initiator" / "Respondent" en el
  contexto del modelo; en las frases al usuario el modelo escribe "the
  protestor" / "the respondent".
- **RF-004 Prompt de extracción.** Cada campo se redacta en inglés y
  **atribuido** a la parte ("The protestor states that…", "The protestor
  requests that…", "The respondent states that…"), nunca como conclusión del
  comité. Números de vela, reglas y cifras exactamente como en el formulario.
  Se omite lo que el formulario no afirma; no se inventa. Una o dos frases por
  campo. Se elimina el texto "almost always empty / re-submitted or annotated
  form".
- **RF-005 Normalización y validación (determinista).** `parseExtraction`
  siempre devuelve `party_position` como objeto (vacío si no hay nada).
  Descarta lo que no sea cadena y las cadenas vacías o solo espacios. Para cada
  campo conserva el texto solo si **nombra a la parte** (coincide con
  `/\b(protest(?:or|er|ee|ant)|initiator|respondent|appellant|party)\b/i`); si
  no, lo descarta (no queda como redacción del comité). Tope de **600
  caracteres** por campo (`slice`). Parte sin ningún campo restante: se omite.
- **RF-006 Sugerencias con etiqueta.** `SuggestionItem` gana un campo opcional
  `tag?: string`. `SuggestionList` lo muestra como una etiqueta corta antes del
  texto del botón: `Party claim — not final`. La etiqueta **no** forma parte del
  texto que se inserta. Es la **única excepción** a D-030 ("el origen no se
  muestra"), y la razón se registra en D-044. En Conclusion (y Decision) se
  añade un ítem por parte con texto en `conclusion` (o `decision`), protestante
  primero, con `id` estable `party_position:initiator` / `party_position:respondent`
  (`SuggestionSource` gana `'party_position'`). Van antes de las sugerencias de
  las hearing notes y después de ningún otro origen de formulario (los
  `protest_form` de Conclusion/Decision desaparecen). Las hearing notes no
  cambian. La etiqueta también cuenta en el buscador de la lista (no se busca
  en ella).
- **RF-007 Contexto del fantasma, cliente.** Un helper nuevo en
  `apps/web/src/partyPosition.ts` (fuera de `CaseForm.tsx`) compone, a partir de
  la extracción, la cadena de contexto: una línea `Initiator: …` y otra
  `Respondent: …` con la conclusión y la decisión de esa parte; devuelve
  `undefined` si no hay texto. `ChainContext` (cliente) admite
  `party_position?: string`. Conclusion y Decision lo pasan en `chain`; las
  otras cajas no.
- **RF-008 Quién la ve (servidor).** `ChainContext` (servidor) admite
  `party_position`. `CONTEXT_BOXES`: Conclusion `['facts_found',
  'rules_applicable', 'party_position']` y Decision `['facts_found',
  'rules_applicable', 'conclusion', 'party_position']`. Procedural Matters,
  Facts Found y Rules Applicable **no** la ven (el servidor aplica la tabla;
  ignora la clave si llega a esas cajas). La postura va siempre **la última**
  del bloque de cajas anteriores. Etiqueta en `CONTEXT_LABEL`:
  `Party position (one side's claim, not final)`.
- **RF-009 Saneado y prompt.** Mismo saneado que el resto de contexto (primeros
  1500 caracteres, marcadores eliminados); `MARKERS` pasa a incluir también la
  etiqueta `Party position` para que un formulario no pueda falsificar el
  bloque. Cuando hay postura, `CONTEXT_SYSTEM` añade: es la alegación de una
  parte, no un hecho ni una decisión del comité; puede contradecirse entre
  partes y no se toma partido; no la repitas ni la presentes como probada;
  apóyate en Facts Found.
- **RF-010 Reglas, filtro en servidor.** `CONTEXT_SYSTEM_OTHERS` se reescribe:
  una referencia de regla solo puede aparecer si ya está en Facts Found, Rules
  Applicable o Conclusion (incluida la caja a continuar) o en el texto a
  continuar, **nunca** si solo está en la postura de parte. Además, en
  Conclusion y Decision, `generateInlineCompletion` **descarta** (devuelve
  cadena vacía) toda sugerencia que cite una regla cuyo número no esté en esas
  fuentes permitidas. Una "cita de regla" es un prefijo `RRS`/`CR`/`NoR`/`SI`
  seguido de un número o letra-número (`44.1`, `C.6.1`, `A2`) o `rule`/`rules`
  más número; se compara el número normalizado. La postura **no** cuenta como
  fuente permitida. Función pura exportada y probada con un script
  desechable.
- **RF-011 Sin postura.** Sin extracción cargada, o con extracción sin
  `party_position`, no se manda la clave y el fantasma funciona como hoy
  (salvo el filtro RF-010, que también protege a Conclusion/Decision sin
  postura).
- **RF-012 Sin migración y desfase de versiones.** Ningún cambio de esquema ni
  de datos guardados. El cliente tolera un JSON de extracción antiguo (con los
  campos viejos y sin `party_position`: se ignoran) y un bundle viejo frente
  al API nuevo (`paragraph: undefined`, ya tolerado por `fromSource`).
- **RF-013 Documentación.** Al terminar: `DECISIONS.md` D-044 (la postura de
  parte es contexto atribuido, nunca conclusión ni decisión del comité;
  excepción de etiqueta a D-030; filtro de reglas amplía D-041 y D-004),
  `issue.md` ISS-007 cerrado y su descripción actualizada, `SPEC-003` y
  `SPEC-020` RF-006 anotadas como superadas en este punto, y `CLAUDE.md` /
  `constitution.md` **solo si el dueño lo ordena**.

## Casos límite

- Formulario de una sola parte (lo normal): solo `initiator`.
- Formulario solo respondent, o con las dos posturas contradictorias: cada una
  etiquetada; el prompt (RF-009) pide no tomar partido.
- Formulario sin postura: sin sugerencias de formulario en Conclusion ni
  Decision, sin error.
- Modelo de extracción devuelve texto sin atribución ("32004 failed to keep
  clear."): descartado por RF-005.
- Postura de más de 600 caracteres: se recorta en la extracción; el fantasma
  recibe como máximo 1500 caracteres.
- Texto del formulario con instrucciones a la IA: es dato, no instrucción
  (marcadores eliminados, `max_tokens` 60, `CHATTER`, el juez acepta con Tab).
- La salida del modelo cita una regla que solo estaba en la postura: se
  descarta (RF-010).

## Límites aceptados

- Una vez el juez inserta de un clic "The protestor states rule 10 was
  broken", ese texto está en Conclusion o Decision y pasa a ser fuente
  permitida (una regla de la parte queda "blanqueada" en su propia caja). Es
  texto atribuido y visible, escrito por el juez al insertarlo; SPEC-028 solo
  avisa si la regla no existe en el corpus, no si el comité la aplicó. No se
  alimenta el registro de citas.
- Una referencia en palabras ("the starboard rule") puede pasar el filtro.
- El filtro RF-010 puede descartar una sugerencia legítima que cite una regla
  bien conocida no presente en las cajas (preferible a dejar pasar una regla
  de la parte).
- El modelo puede apoyarse en la postura en una frase que el juez no
  pretendía; el juez acepta con Tab, nunca se inserta solo. Una inyección de
  segundo orden vía el PDF queda acotada por `max_tokens` 60, una frase,
  `CHATTER`, el filtro de reglas y la aceptación manual.
- La extracción no se guarda: se rehace al recargar.

## Criterios de aceptación (verificación en vivo, TEST-02, sin guardar)

1. Formulario con postura del protestante: Extract muestra en Conclusion y en
   Decision una sugerencia con la etiqueta `Party claim — not final`, texto
   atribuido ("The protestor …"), y un clic inserta solo el texto sin la
   etiqueta.
2. Formulario que solo describe el incidente: ninguna sugerencia de formulario
   en Conclusion ni Decision, sin error.
3. Red del navegador: el cuerpo de `complete` lleva `context.party_position`
   solo en Conclusion y Decision, y no en Procedural, Facts ni Rules.
4. El fantasma de Conclusion continúa coherente con la postura sin presentarla
   como probada.
5. Prueba pura (script): el filtro RF-010 descarta una sugerencia con una regla
   que solo está en la postura y deja pasar una cuyo número está en Facts
   Found, Rules Applicable, Conclusion o el texto; `chainContextFor` incluye la
   postura solo en Conclusion y Decision, la recorta y neutraliza la etiqueta
   falsa.
6. Prueba pura: `parseExtraction` descarta texto sin atribución, recorta a 600
   caracteres y omite partes vacías; tolera `party_position` ausente.
7. Sin extracción cargada (página recién recargada), todo se comporta como hoy.
8. Hearing notes: sus sugerencias de Conclusion y Decision siguen igual.
9. Postura de más de 1500 caracteres en el contexto: el fantasma sigue
   funcionando.

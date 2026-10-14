# SPEC-026 — Aviso de huecos sin rellenar

Fase F6, primer trozo (`issue.md` ISS-010 y nota de D-036). Estado: v2 (tras
`reviewer`: 3 bloqueantes, 5 importantes, 5 menores, todo recogido).

## Problema

SPEC-025 inserta frases con `[huecos]` y etiquetas `X` / `Y`. Si el juez se
deja alguno sin rellenar, el texto con el hueco llega al documento final
(Copy por caja o Download) sin ningún aviso. Es un fallo silencioso que sale
en un documento oficial.

## Alcance

Solo cliente (`apps/web`). Sin IA, sin API, sin base de datos. La herramienta
**avisa, no bloquea**: el humano decide. Alternativa descartada: bloquear
Download (impide sacar un borrador a propósito). Se registra en D-037.

Fuera: desfase entre cajas, cadena en la IA, validar referencias tecleadas
(otros trozos de F6).

## Qué se analiza

Solo **lo que el juez escribe** en las cinco cajas, tal cual está en el
estado de `CaseForm` (`proceduralMatters`, `factsFound`, `conclusion`,
`rulesApplicable`, `decision`). Para Rules Applicable se analiza **solo el
texto de la caja**, no el fallback de la lista de citas (viene del corpus, no
lo escribe el juez). No se analiza nada de otras pestañas (Parties, nombres
de barco, testigos, jueces).

Función pura `pendingMarks(text)` en `apps/web/src/pendingMarks.ts`, sobre la
misma `phraseGaps` de SPEC-025 (una sola definición de hueco y de etiqueta),
con el texto pasado por `normalizePhraseText`:

- **Huecos:** cada corchete exterior balanceado que no es `[X]`/`[Y]`
  (`[The RC]`, `[##]`). Un `[` sin pareja es texto y no cuenta. El texto del
  hueco se extrae con `text.slice(start, end)`.
- **Partes sin sustituir:** cada etiqueta `X`, `Y` o grupo `[X] [Y]` (el grupo
  cuenta como una).
- Resultado: `{ gaps: string[]; parties: PartyLabel[]; count: number }`,
  `count = gaps.length + parties.length`.

El aviso es **informativo**: puede haber falsos positivos (corchetes
legítimos como `[sic]`, o una `X`/`Y` escrita a propósito, p. ej. "Plan X",
"John X. Smith"). El juez decide; por eso nunca bloquea ni modifica texto.

Texto del aviso, una sola función `describePending(p)`: `"2 gaps, 1 party
label (X/Y) still to fill"` (omite la parte con 0).

## Requisitos

- **RF-001** `pendingMarks` y `describePending` como arriba; probadas con un
  script desechable sobre las frases de la tabla `phrase` de la base local
  (toda frase con huecos o etiquetas da `count > 0`; sin ellos 0) y casos
  límite (`[` suelto, anidados, `Appendix X`, `X-ray`, `[sic]`).
- **RF-002 Copy por caja**: `CopyBox` recibe un prop opcional `pendingText`;
  solo `WritingBox` lo pasa (las cinco cajas; Rules Applicable pasa el texto
  de la caja, no `copyText`). `PartiesTab` no lo pasa y no avisa. Si
  `pendingMarks(pendingText).count > 0`, una línea de aviso entre la cabecera
  y el cuerpo, **visible también con la caja colapsada**. No impide copiar.
- **RF-003 Download**: `handleDownload` calcula los pendientes de las cinco
  cajas; si hay alguno, un único `window.confirm` con una línea por caja
  ("Facts Found: 2 gaps, 1 party label …") y "Download anyway?". El `confirm`
  va antes de crear el Blob; cancelar no hace nada. Sin pendientes, descarga
  directa.
- **RF-004 Review**: resumen arriba de la sección Review (una línea por caja
  con pendientes) o nada. Se recalcula en cada render a partir de los mismos
  textos que RF-003, calculado en `CaseForm` después de `if (!caseFull)`,
  como `liveCase`; sin memoización.
- **RF-005** Las cinco cajas, como arriba. Las líneas de
  `formatAutoProceduralLines` no se tratan aparte: solo alimentan
  sugerencias; una vez insertadas por el juez son su texto y se analizan como
  cualquier otro.
- **RF-006** Nada se modifica en el texto del juez.

## Criterios de aceptación (verificación en vivo, TEST-02, sin guardar)

1. Insertar una frase con `[hueco]` y `Y`: aviso en esa caja y resumen en Review.
2. Rellenar el hueco y sustituir Y: el aviso desaparece sin recargar.
3. Caja colapsada con pendientes: el aviso sigue visible.
4. Download con pendientes: confirmación; cancelar no descarga. Sin
   pendientes: descarga sin confirmación.
5. Pestaña Parties: sin aviso. Cajas sin pendientes: sin aviso. Copy funciona
   en todos los casos.

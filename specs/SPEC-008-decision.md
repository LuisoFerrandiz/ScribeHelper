# SPEC-008 — Decision

Estado: draft (parcialmente ya construido, con cambios nuevos sobre lo
existente — ver "Alcance").

Relacionado: `CLAUDE.md` (Los dos mecanismos de sugerencia),
`constitution.md` → Principios (preferir lo determinista sobre IA
cuando ambos resuelvan el mismo problema; nada se inserta sin acción
explícita), `DECISIONS.md` D-007 (tres almacenes), D-022 (librería de
frases, hoja Protest/Redress Decisions → `decision`),
`SPEC-006-facts-found.md` (fuente 1 — mismo patrón de lista de
referencia siempre visible, extendido aquí con la(s) prueba(s)),
`SPEC-007-conclusion.md` (fuente 3 — mismo pipeline genérico, extendido
a una caja más).

## Intención

Misma estructura que SPEC-005/006/007: la caja "Decision" ya tiene
layout de dos partes (texto libre + panel de sugerencias,
`CaseForm.tsx:911-934`). Esta spec fija las 3 fuentes de sugerencia
para esta caja. A diferencia de Conclusion, la fuente 1 aquí no es el
párrafo candidato del protest form (que casi nunca aplica a Decision —
un formulario de protesta se presenta antes del fallo) sino una lista
de referencia siempre visible, extendiendo el patrón de
`PartyReference.tsx` (SPEC-006) con la(s) prueba(s) del caso.

## Alcance

**Dentro:**
- Confirmar el layout de dos partes — ya construido, sin cambios.
- **Fuente 1 — Lista de referencia (nueva).** Extender
  `PartyReference.tsx` (o un componente nuevo basado en él) para
  mostrar, siempre visible y de solo lectura, encima del panel de
  sugerencias de Decision: initiator (sail number + boat name),
  respondent (sail number + boat name) y la(s) prueba(s) del caso
  (campo `race`, texto libre tal cual se guardó — p.ej. "1" o "1, 2").
  Cada fila se resalta si su valor aparece como substring en el texto
  actual de Decision — misma lógica `matches()` ya usada para
  initiator/respondent en Facts Found, extendida a una tercera fila
  para `race`. Nunca inserta nada; nunca cambia el dato del caso.
- **Fuente 2 — Phrases.** Ya construida, sin cambios: `PhrasePicker`
  con `box="decision"`, seeded desde la hoja Protest/Redress Decisions
  (D-022).
- **Fuente 3 — AI sobre examples** (**nueva**, sustituye "AI draft"
  solo para esta caja): mismo patrón que SPEC-005/006/007 — frases
  sueltas generalizadas, extraídas de las secciones "Decision" de
  `examples/` (base + own) aceptados, click-to-insert, nunca inventa.
  Requiere ampliar `ExampleSuggestionBox` (ya incluye `'conclusion'`
  tras SPEC-007) con `'decision'`, en backend y frontend, más
  `BOX_SECTION_HINT` y `VALID_BOXES`.
- Activar `'decision'` en `EXAMPLE_SUGGESTION_BOXES`
  (`SuggestionsPanel.tsx`) — con esto, **las 4 cajas de redacción**
  (Procedural Matters, Facts Found, Conclusion, Decision) muestran "AI
  suggestions" desde examples; "AI draft" queda sin ningún uso activo
  en `SuggestionsPanel` (se mantiene en el código por si una caja
  futura lo necesita, no se borra en esta spec).

**Fuera de esta spec:**
- Párrafo candidato del protest form para Decision
  (`decision_candidate` de `extract.ts`) — casi siempre vacío por
  construcción (el protest form se presenta antes del fallo); no se
  conecta aquí. Si en el futuro aparece un caso real donde sí aplica,
  se revisita como spec propia, igual que se hizo explícitamente para
  Conclusion.
- Múltiples pruebas como lista estructurada — `race` sigue siendo un
  campo de texto libre por caso, sin parsear en números individuales.
- Borrar "AI draft"/`AIDraftPanel.tsx` del código.

## Requisitos funcionales

- **RF-001 — Lista de referencia con prueba(s).** Panel de Decision
  muestra siempre, antes de las secciones colapsables: initiator,
  respondent, prueba(s) — con resaltado por substring contra el texto
  actual, igual que ya hace Facts Found con initiator/respondent (sin
  resaltado especial para `race` si el dato no existe — fila se oculta
  o se muestra vacía como "—", igual que `formatBoat()` hace con
  partes sin dato).
- **RF-002 — Phrases sin cambio.** `PhrasePicker` sigue funcionando
  igual para `box="decision"`.
- **RF-003 — AI suggestions desde examples.** Al abrir "AI
  suggestions" en el panel de Decision, se listan frases generalizadas
  minadas de la sección Decision de los ejemplos aceptados.
- **RF-004 — Nada se inserta o resalta solo sin ser visible.** Las
  fuentes 2 y 3 siguen siendo click-to-insert; la fuente 1 es de solo
  lectura, nunca escribe en la caja.

## Decisiones técnicas

- La lista de referencia (fuente 1) reusa el patrón de
  `PartyReference.tsx` en vez de crear un componente sin relación —
  misma lógica de resaltado, una fila más.
- Fuente 3 reusa el pipeline genérico igual que en SPEC-007: ampliar un
  union type y dos listas de constantes, sin tocar la función de
  extracción ni el prompt.
- Decisión confirmada con el dueño (no una suposición): la fuente 2 no
  necesita cambios.

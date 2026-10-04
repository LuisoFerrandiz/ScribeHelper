# SPEC-007 — Conclusion

Estado: draft (parcialmente ya construido, con cambios nuevos sobre lo
existente — ver "Alcance").

Relacionado: `CLAUDE.md` (Los dos mecanismos de sugerencia),
`constitution.md` → Principios (preferir lo determinista sobre IA
cuando ambos resuelvan el mismo problema; nada se inserta sin acción
explícita), `DECISIONS.md` D-007 (tres almacenes), D-022 (librería de
frases, mapeo de hojas Validity/Protest-Redress Conclusions/Reopenings
→ `conclusion`), `SPEC-003-documentacion-previa.md` (fuente 1),
`SPEC-005-procedural-matters.md` y `SPEC-005-plan.md` /
`SPEC-006-facts-found.md` (mismo patrón de pipeline de frases y de
fuente IA+examples, heredado aquí sin rediseñar).

## Intención

Misma estructura que SPEC-005/SPEC-006: la caja "Conclusion" ya tiene
layout de dos partes (texto libre + panel de sugerencias,
`CaseForm.tsx:833-856`). Esta spec fija las 3 fuentes de sugerencia
para esta caja, activando para Conclusion lo que las dos specs
anteriores ya construyeron de forma genérica, más una pieza nueva de
una línea (fuente 1).

## Alcance

**Dentro:**
- Confirmar el layout de dos partes — ya construido, sin cambios.
- **Fuente 1 — Protest form.** `extractFromAttachments`
  (`apps/api/src/ai/extract.ts`) ya devuelve `conclusion_candidate`
  (string, normalmente vacío — un protest form se presenta antes de la
  audiencia, no después; solo lo rellena un formulario re-presentado o
  anotado). Falta conectarlo: pasarlo a `SuggestionsPanel` como
  `protestForm={{ paragraph: { label: 'From protest form', text: ... } }}`,
  mismo patrón ya usado en Procedural Matters
  (`CaseForm.tsx:782-787`). Sin cambio de backend.
- **Fuente 2 — Phrases.** Ya construida, sin cambios: `PhrasePicker`
  con `box="conclusion"`, seeded desde las hojas Validity/Protest-Redress
  Conclusions/Reopenings (D-022). Decisión explícita de esta spec: no
  se añade subcategorización por tipo de caso — se mantiene como lista
  única buscable por texto, igual que las demás cajas.
- **Fuente 3 — AI sobre examples** (**nueva**, sustituye "AI draft"
  solo para esta caja): mismo patrón que SPEC-005/006 — frases sueltas
  generalizadas, extraídas de las secciones "Conclusion" de
  `examples/` (base + own) aceptados, click-to-insert, nunca inventa.
  Requiere tocar el tipo `ExampleSuggestionBox` (hoy
  `'procedural_matters' | 'facts_found'`) para incluir `'conclusion'`,
  en backend y frontend, más el mapa `BOX_SECTION_HINT` y la lista
  `VALID_BOXES` de la ruta — la función de extracción y el prompt ya
  son genéricos por `box`, no se tocan.
- Activar `'conclusion'` en `EXAMPLE_SUGGESTION_BOXES`
  (`SuggestionsPanel.tsx`), con lo que el panel de Conclusion muestra
  "AI suggestions" en vez de "AI draft" — igual decisión ya tomada para
  Procedural Matters/Facts Found.

**Fuera de esta spec:**
- "AI draft" clásico para Decision — sigue como está, sin tocar.
- Cualquier ayuda determinista nueva (autocompletado, lista de
  referencia) — Conclusion no tiene un dato estructurado equivalente al
  sail number→rol de Facts Found; no se inventa uno aquí.
- Subcategorización de phrases por tipo de caso (confirmado con el
  dueño: no se añade — ver Fuente 2).

## Requisitos funcionales

- **RF-001 — Protest form candidate.** Si `extraction.conclusion_candidate`
  no está vacío, aparece como párrafo insertable "From protest form" en
  el panel de Conclusion. Si está vacío (caso normal), esa sección del
  panel no aparece — mismo comportamiento que Procedural Matters cuando
  no hay candidato.
- **RF-002 — Phrases sin cambio.** `PhrasePicker` sigue funcionando
  igual para `box="conclusion"` — búsqueda por texto, insertar, guardar
  texto actual como frase nueva.
- **RF-003 — AI suggestions desde examples.** Al abrir la sección "AI
  suggestions" del panel de Conclusion, se listan frases generalizadas
  minadas de la sección Conclusion de los ejemplos aceptados — igual
  mecánica que Procedural Matters/Facts Found, mismo endpoint genérico
  por `box`.
- **RF-004 — Nada se inserta solo.** Las tres fuentes son
  click-to-insert; ninguna escribe en la caja sin esa acción explícita
  (R-06/R-07).

## Decisiones técnicas

- Fuente 1 reusa un campo de extracción que ya existe — no se añade
  ningún campo nuevo a `AttachmentExtraction`.
- Fuente 3 reusa el pipeline genérico sin cambiar su diseño: ampliar un
  union type y dos listas de constantes, no reescribir la función de
  extracción ni el prompt.
- Decisión confirmada con el dueño (no una suposición): la fuente 2 no
  necesita cambios — la mezcla de las 3 subcategorías del spreadsheet
  en una sola lista buscable ya es suficiente.

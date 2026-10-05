# SPEC-012 — Decision: fuente "protest form"

Estado: draft.

Relacionado: `SPEC-008-decision.md` (spec cerrada que construyó el
panel de Decision con 3 fuentes — Lista de referencia, Phrases, AI
suggestions — y dejó explícitamente fuera la fuente "protest form":
"casi siempre vacío por construcción... Si en el futuro aparece un
caso real donde sí aplica, se revisita como spec propia, igual que se
hizo explícitamente para Conclusion" — esta es esa spec), `DECISIONS.md`
D-029 (coherencia interna, regla 2: si una pestaña de las 4 cajas de
redacción ofrece una fuente dada, esa fuente debe ofrecerse de forma
uniforme en las 4 — cita explícitamente este hueco como ejemplo
concreto), `SPEC-007-conclusion.md` (mismo patrón ya construido:
`protestForm` condicional en el `SuggestionsPanel` de Conclusion,
gateado por `extraction?.conclusion_candidate`), `apps/api/src/ai/extract.ts`
(el campo `decision_candidate` ya existe y ya se extrae — no se toca en
esta spec), `SPEC-003-documentacion-previa.md` (donde se documentó por
primera vez el `[GAP]` de `conclusion_candidate`/`decision_candidate`
sin conectar a UI, anticipando este seguimiento).

## Intención

De las 4 cajas de redacción (Procedural Matters, Facts Found,
Conclusion, Decision), las primeras 3 ofrecen la fuente "protest form"
en su `SuggestionsPanel` (párrafo o líneas candidatas extraídas del
adjunto, mostradas solo si existen, nunca insertadas sola). Decision es
la única que no la ofrece — no por limitación técnica (el campo
`decision_candidate` existe en `AttachmentExtraction` desde el inicio
del proyecto, se extrae igual que los demás candidatos) sino porque
SPEC-008 decidió no conectarlo, al ser un campo que "casi siempre"
viene vacío (el protest form se presenta antes del fallo, así que
normalmente no declara ya una decisión). D-029 regla 2 exige
uniformidad de fuentes entre las 4 cajas — esta spec cierra ese hueco
conectando `decision_candidate` al panel de Decision exactamente con el
mismo patrón ya usado en Conclusion: aparece solo si el campo no está
vacío, nunca inserta nada automáticamente.

## Alcance

**Dentro:**
- Pasar `protestForm={extraction?.decision_candidate ? { paragraph: { label: 'From protest form', text: extraction.decision_candidate } } : undefined}`
  al `SuggestionsPanel` de la caja Decision en `CaseForm.tsx`
  (`caseTab === 'decision'`), mismo patrón literal que ya usa
  Conclusion (`CaseForm.tsx` ~líneas 899-903).

**Fuera de esta spec:**
- Tocar `extract.ts`, el prompt, o el campo `decision_candidate` —
  ya existen, sin cambios.
- Las otras 3 fuentes de Decision (Lista de referencia, Phrases, AI
  suggestions) — construidas en SPEC-008, sin cambios.
- Cualquier otro gap de D-029 fuera del de Decision/protest-form.

## Requisitos funcionales

- **RF-001 — Fuente "protest form" visible en Decision cuando
  aplica.** Si un caso tiene `extraction?.decision_candidate` no
  vacío (el protest form procesado declaraba ya una decisión), el
  panel de sugerencias de Decision muestra esa fuente, con el mismo
  formato/label ("From protest form") que usa Conclusion.
- **RF-002 — Oculta cuando no aplica.** Si `decision_candidate` está
  vacío (caso normal, el campo casi siempre lo está), la fuente no
  aparece — igual que hoy pasa con Conclusion cuando
  `conclusion_candidate` está vacío. Nunca un placeholder vacío ni un
  texto "no disponible".
- **RF-003 — Nunca se inserta solo.** Click-to-insert, igual que las
  demás fuentes de sugerencia — ningún candidato se escribe en la caja
  sin una acción explícita del usuario.

## Decisiones técnicas

- Un único prop añadido a una llamada ya existente — no se crea
  ningún componente, tipo, ni campo de backend nuevo. El campo
  `decision_candidate` ya viaja en `AttachmentExtraction` desde antes
  de esta spec.
- Mismo patrón exacto que Conclusion (no un patrón nuevo) — D-029
  regla 2 pide uniformidad, así que la forma de ofrecer la fuente debe
  ser la misma, no solo el hecho de ofrecerla.

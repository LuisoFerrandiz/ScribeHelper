# SPEC-006 — Facts Found

Estado: draft (parcialmente ya construido, con cambios nuevos sobre lo
existente — ver "Alcance").

Relacionado: `CLAUDE.md` (Los dos mecanismos de sugerencia), `constitution.md`
→ Principios (preferir lo determinista sobre IA cuando ambos resuelvan
el mismo problema; nada se inserta sin acción explícita),
`DECISIONS.md` D-007 (tres almacenes), D-022 (librería de frases),
D-025 (autocompletado en línea, ghost text), `SPEC-003-documentacion-previa.md`
(fuente 1), `SPEC-005-procedural-matters.md` y `SPEC-005-plan.md`
(mismo patrón de pipeline de frases y de fuente IA+examples, heredado
aquí sin rediseñar).

## Intención

Misma estructura que SPEC-005: la caja "Facts Found" ya tiene layout
de dos partes (texto libre + panel de sugerencias). Esta spec fija las
3 fuentes de sugerencia para esta caja y añade dos ayudas nuevas,
específicas de Facts Found: autocompletado de número de vela →
rol (initiator/respondent), y una lista de referencia de partes que se
actualiza en vivo.

## Alcance

**Dentro:**
- Confirmar el layout de dos partes — ya construido
  (`CaseForm.tsx:793-806`), sin cambios.
- **Fuente 1 — Protest form** (ya construida, sin cambios): sigue
  siendo `facts_found_candidates` de la extracción de SPEC-003, sobre
  el formulario completo (no solo el campo de descripción — ya cubre
  descripción, daños, observaciones, todo el documento).
- **Fuente 2 — Phrases** (ya construida, hereda el cambio de SPEC-005):
  librería de frases vía `.md` convertido (SPEC-005), sin diseño
  nuevo aquí — `facts_found` ya tiene algunas filas base desde la hoja
  "NO Hearing" (D-022).
- **Fuente 3 — AI sobre examples** (**nueva**, sustituye "AI draft"
  solo para esta caja): mismo patrón que SPEC-005 — frases sueltas
  generalizadas, extraídas de las secciones "Facts Found" de
  `examples/` (base + own) aceptados, click-to-insert, nunca inventa.
- **Autocompletado sail number → rol** (**nuevo**): al escribir un
  número de vela que coincide con el initiator o el respondent de
  *este caso*, el ghost-text completa con el rol
  (`" (initiator)"`/`" (respondent)"`) — determinista, sin IA, Tab
  acepta.
- **Lista de referencia de partes** (**nuevo**): en el panel de
  sugerencias, una sección siempre visible con el número de vela +
  nombre de barco del initiator y del respondent *de este caso*
  (nunca estática — se lee de los datos ya guardados en General &
  Parties); resalta la fila que coincide con lo que el usuario está
  escribiendo en ese momento.

**Fuera (de esta spec):**
- Cambiar "AI draft" en Procedural Matters (ya resuelto, SPEC-005),
  Conclusion o Decision — cada una su propia spec futura.
- Witnesses en el autocompletado/lista de referencia — solo
  initiator/respondent (no se pidió para testigos).
- Tab "2. Jury" — sigue aplazado.

## Requisitos

**RF-001 — Dos partes separadas**
Igual que SPEC-005 RF-001, ya cumplido (`box-body-split` en el tab
Facts Found).

**RF-002 — Fuente 1: Protest form**
Sin cambios — `facts_found_candidates`, formulario completo, ya
construido.

**RF-003 — Fuente 2: Phrases**
Sin cambios de diseño — hereda el pipeline `.md` de SPEC-005 en cuanto
esa spec se implemente; mientras tanto sigue leyendo del `.xlsx` como
hoy, sin romper nada.

**RF-004 — Fuente 3: sugerencias IA desde `examples/`**
Dado al menos un `example` aceptado con una sección "Facts Found" no
vacía, cuando el usuario abre la sección "AI suggestions" del panel
(sustituye a "AI draft" para esta caja), entonces la IA devuelve una
lista de frases candidatas generalizadas (sin sail numbers/boat
names/fechas del example de origen), cada una insertable con un click
— mismo contrato que RF-004 de SPEC-005, aplicado a "Facts Found" en
vez de "Procedural Matters".

**RF-005 — Autocompletado sail number → rol**
Dado el initiator y el respondent de este caso ya guardados (General &
Parties), cuando el usuario escribe en la caja Facts Found una
secuencia que coincide exactamente con uno de esos dos números de
vela, entonces aparece ghost-text con el rol correspondiente
(`" (initiator)"` o `" (respondent)"`); Tab lo acepta, seguir
escribiendo o Escape lo descarta — mismo mecanismo ya usado por el
autocompletado IA (`GhostTextarea.tsx`), pero determinista: no llama a
ningún modelo, es una comparación directa contra los dos sail numbers
del caso.

**RF-006 — Lista de referencia de partes, en vivo**
Dado el panel de sugerencias de Facts Found, cuando se abre, entonces
muestra siempre initiator y respondent (sail number + boat name) de
*este caso* — nunca un ejemplo fijo ni de otro caso. Cuando el usuario
escribe un número de vela que coincide (parcial o total) con uno de
los dos, la fila correspondiente se resalta visualmente.

**RF-007 — Nada se inserta sin click (o Tab, para ghost-text)**
Mismo principio que SPEC-005 RF-005 — la lista de referencia (RF-006)
es solo lectura, nunca inserta nada por sí misma; el autocompletado
(RF-005) requiere Tab, igual que el resto de ghost-text del proyecto.

## Autocompletado sail number → rol — diseño funcional (detalle en el plan)

- Determinista, no una llamada a IA — los dos sail numbers de este
  caso ya están en memoria (`initiator.sailNumber`/
  `respondent.sailNumber`, ya cargados por el tab General & Parties).
  Coherente con `constitution.md`: "preferir lo determinista sobre la
  IA cuando ambos puedan resolver el mismo problema".
- Convive con el autocompletado IA ya existente (D-025) en la misma
  caja — cuál tiene prioridad cuando ambos podrían aplicar a la vez se
  decide en el plan, no aquí.
- Solo aplica si el caso ya tiene sail number guardado para esa parte
  — si initiator o respondent están vacíos, no hay nada que sugerir
  para ese rol.

## Lista de referencia de partes — diseño funcional (detalle en el plan)

- Lee los mismos datos que ya carga el tab General & Parties para este
  caso (sin una llamada nueva al backend si ya están en memoria del
  componente padre).
- "Resaltar" es una ayuda visual (ej. negrita o fondo), no inserta
  nada ni cambia el texto del usuario.

## Seguridad y privacidad

- Fuente 3 requiere `ANTHROPIC_API_KEY`, igual que SPEC-005 — su
  ausencia no rompe el resto del tab.
- RF-005/RF-006 no usan IA ni red — funcionan offline, coherente con
  `constitution.md`: "todo lo que no es IA funciona sin conexión".

## Decisiones técnicas

- Fuente 3 sigue exactamente el mismo contrato que SPEC-005 (examples
  base+own, generalización obligatoria, click-to-insert, nunca
  inventa) — no se repite el diseño, se referencia.
- Fuente 2 hereda el pipeline de SPEC-005 sin cambios propios.
- RF-005/RF-006 son los únicos elementos genuinamente nuevos de diseño
  en esta spec, ambos deterministas.

## Explícitamente fuera de esta spec

- Cambiar "AI draft" en Conclusion/Decision.
- Autocompletado/lista de referencia para witnesses.
- Tab "2. Jury".
- Botón de descarga del `.xlsx` original (ya descartado en SPEC-005).

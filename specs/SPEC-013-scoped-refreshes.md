# SPEC-013 — Refrescos acotados para With case(s), adjuntos y reglas

Estado: draft.

Relacionado: `SPEC-011-general-parties-split.md` (donde se documentó
explícitamente este hallazgo colateral, marcado "Fuera de esta tanda
de tareas", candidato a spec de seguimiento — esta es esa spec),
`SPEC-009-repaso-lectura.md` (`reloadJury()`, primer precedente del
patrón de refresco acotado), `SPEC-011-plan.md` (`refreshParties()`,
segundo precedente), `CLAUDE.md`/`constitution.md` → principio
"verificar hechos al implementar" (el bug que esto corrige es
silencioso: no lanza error, solo pierde texto sin avisar).

## Intención

`CaseForm.tsx` tiene un `reload()` genérico que re-siembra **todo** el
estado local desde el servidor — incluyendo las 4 cajas de texto libre
(Procedural Matters, Facts Found, Conclusion, Decision) y los campos de
General (Case number/Day/Race/Informed at). Desde SPEC-009 este
proyecto evita deliberadamente llamar a `reload()` tras cualquier
acción que no sea la carga inicial del caso, porque pisaría en
silencio cualquier texto sin guardar en otra pestaña — de ahí
`reloadJury()` (SPEC-009) y `refreshParties()` (SPEC-011), cada uno
acotado a refrescar solo lo que su propia acción cambió.

Quedaron sin corregir 6 handlers que siguen llamando al `reload()`
genérico: `handleLinkCase`/`handleRemoveLink` (With case(s)),
`handleUploadAttachment`/`handleRemoveAttachment` (adjuntos, tab "0.
Protest Form(s)"), `handleAddRule`/`handleRemoveRule` (Rules
Applicable). Los 3 pares actúan al instante (no son parte de un Save
batcheado — ya documentado así en SPEC-011), así que el riesgo es
real: editar, por ejemplo, Facts Found sin guardar y luego subir un
adjunto en la pestaña "0" borra ese texto sin aviso, porque
`handleUploadAttachment` llama a `reload()`.

## Alcance

**Dentro:**
- `refreshLinkedCases()` — refresca solo `caseFull.linkedCases`.
  Reemplaza `reload()` en `handleLinkCase`/`handleRemoveLink`.
- `refreshAttachments()` — refresca solo `caseFull.attachments`.
  Reemplaza `reload()` en `handleUploadAttachment`/`handleRemoveAttachment`.
- `refreshRuleCitations()` — refresca solo `caseFull.ruleCitations`.
  Reemplaza `reload()` en `handleAddRule`/`handleRemoveRule`.
- Cada función sigue el mismo patrón ya establecido por
  `reloadJury()`/`refreshParties()`: un `GET` a `getCaseFull(caseId)`,
  actualiza `caseFull` solo en el campo correspondiente vía
  `setCaseFull((prev) => prev ? { ...prev, <campo>: full.<campo> } : full)`,
  nunca toca las 4 cajas de texto ni los campos de General.

**Fuera de esta spec:**
- El `reload()` genérico en sí — se queda, sigue siendo correcto para
  su único uso real: el `useEffect` de montaje inicial al abrir un
  caso (`CaseForm.tsx:203-206`), donde no hay nada sin guardar que
  proteger.
- Cualquier otro handler o pestaña no listada arriba.
- Cambiar el comportamiento visible de With case(s)/adjuntos/Rules
  Applicable — siguen actuando al instante, sin Save propio, igual que
  hoy.

## Requisitos funcionales

- **RF-001 — Vincular/desvincular un caso no pisa texto sin
  guardar.** Escribir texto sin guardar en cualquiera de las 4 cajas
  libres, luego vincular o desvincular un caso en "With case(s)"
  (pestaña General) → el texto sin guardar sigue intacto.
- **RF-002 — Subir/quitar un adjunto no pisa texto sin guardar.**
  Mismo escenario que RF-001, con subir o quitar un archivo en "0.
  Protest Form(s)".
- **RF-003 — Añadir/quitar una regla citada no pisa texto sin
  guardar.** Mismo escenario que RF-001, con añadir o quitar una cita
  en "Rules Applicable" (pestaña Conclusion).
- **RF-004 — Sin regresión visible.** La lista de casos vinculados, la
  lista de adjuntos y la lista de reglas citadas se actualizan en
  pantalla exactamente igual que antes de esta spec (mismo efecto
  visible, ruta de datos distinta).

## Decisiones técnicas

- Tres funciones nuevas, no una genérica parametrizada — mismo
  criterio que `reloadJury()`/`refreshParties()`: cada una vive al
  lado del handler que la usa, nombre explícito, sin indirección.
- Ninguna toca `otherCases` (la lista de "otros casos del evento" para
  el desplegable de With case(s)) — vincular/desvincular no cambia qué
  casos existen en el evento, solo cuáles están vinculados a este.

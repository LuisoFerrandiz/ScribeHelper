# SPEC-024 — Refactor de `CaseForm.tsx` (ISS-006)

> **Nota (2026-10-15):** SPEC-034 (D-046) sustituye el "contrato de `WritingBox`"
> (`CopyBox > .box-body-split > .textarea-col + .suggestions-col`): `WritingBox` es ahora una
> sola columna (franja o bandeja, referencia de partes, cuadro y lo que va debajo) y esas
> clases ya no existen.

Estado: **CERRADA (2026-10-15)**: pasos 1a a 4 hechos; el paso 5 (hooks) queda
descartado por el dueño (riesgo alto, ~200 líneas de ganancia). Antes: draft v2,
aprobado el plan por el dueño (2026-10-14). v2
incorpora la revisión del subagente `reviewer` (3 bloqueos, 10
importantes). Origen: ISS-006 (`issue.md`). **Refactor puro: sin cambio
de comportamiento observable.** Va **antes** de SPEC-022 (F1): no se edita
`CaseForm.tsx` en paralelo.

Relacionado: `constitution.md` ("Separar UX de lógica de programación",
D-028), D-029 (coherencia por pestaña, no afecta a la estructura de
ficheros), SPEC-009 RF-007 y SPEC-013 (refrescos parciales), SPEC-014
(Save único), SPEC-016/017/020/023.
`apps/web/src/components/CaseForm.tsx` (1091 líneas).

## Intención

`CaseForm()` concentra el estado del caso, la carga y los refrescos
parciales, el guardado, el procesado de notas y adjuntos, y **todo el
JSX de nueve pestañas**. Cada spec reciente (011 a 023) lo ha tocado y no
hay suite de tests. Objetivo: bajarlo todo lo posible extrayendo piezas
**sin cambiar lo que ve ni lo que hace el usuario**, en pasos pequeños y
verificables. **Meta revisada (2026-10-14):** ≈ 700 líneas tras el paso 4
(quedan ~100 de estado, `reload`, refrescos, `handleSaveAll` y ~130 de
handlers, más el `return`); el paso 5 (hooks) lo bajaría a ≈ 550-600. La
meta inicial de 450-500 era optimista.

## Qué hay hoy (verificado 2026-10-14)

- ~25 `useState`/`useRef` en un componente. Cinco refrescos parciales casi
  idénticos: `reloadJury`, `refreshLinkedCases`, `refreshAttachments`,
  `refreshRuleCitations` (los cuatro: `getCaseFull` +
  `setCaseFull(prev => prev ? {...prev, <parte>} : full)`) y
  `refreshParties`, que **además** rehace `partyDrafts` y `witnessDraft`.
  Ninguno captura errores.
- La conversión `CaseFull → PartyDraft[]`/`WitnessDraft[]` está duplicada
  (`reload` y `refreshParties`). `PartyDraft`, `WitnessDraft` y
  `emptyPartyDraft` se declaran en `CaseForm.tsx` sin exportar.
- Nueve bloques `{caseTab === 'x' && (<div className="tab-panel">…)}`; nueve
  `<button>` de pestaña casi idénticos (~75 líneas).
- Las cinco cajas de redacción repiten `CopyBox` + `box-body-split` +
  `textarea-col` + `suggestions-col`, **con diferencias**: Facts y Decision
  envuelven `PartyReference` + `SuggestionList` en un
  `div.suggestions-panel` (Decision pasa además `race`); Procedural y
  Conclusion ponen `SuggestionList` directo; Rules pone `RulesSuggestions`
  directo y su `CopyBox` usa `formatRulesApplicable(liveCase)`, no el texto
  crudo; `rows` son 4/6/4/6/4; `sailNumberRoles` solo en Facts; Decision
  lleva antes un `section.box` con "Informed at".
- Parties usa dos claves de `copied` (`parties` y `witness`) y no usa
  `box-body-split`.
- `onInsertMissing` (Rules) lee `liveCase` en el momento del clic.
- `liveCase` y `autoProceduralLines` se calculan **después** de
  `if (!caseFull) return` (no pueden pasar a un hook sin cambiar el orden
  de hooks).
- Defecto conocido y **no se arregla aquí** (R-1): dentro de un mismo Save,
  `boats` no se actualiza hasta el siguiente render, así que dos partes
  nuevas con el mismo barco crean dos barcos.

## Alcance

**Dentro:** mover código a ficheros nuevos y helpers, con las mismas firmas
de datos y el mismo árbol DOM. **Fuera:** cambios de UX, textos, CSS,
rutas, tipos de la API o modelo de datos; funciones nuevas; SPEC-022.

## Reglas del refactor

- **R-1 Sin cambio observable.** Mismo DOM (incluidas clases CSS,
  `aria-current="false"` de los botones inactivos, atributos y envolturas),
  mismos textos, mismo orden. **No se reformatea código movido** y los
  `{' '}` que hacen de separador de texto se conservan tal cual (el diff se
  revisa con espacios en blanco visibles). **Los comentarios se mueven
  tal cual**, aunque estén desactualizados (arreglarlos va en otro commit).
- **R-2 Estado en el padre.** Se quedan en `CaseForm`: los cinco textos de
  las cajas, `partyDrafts`, `witnessDraft`, `caseNumber`, `day`, `race`,
  `informedAt`, `withCaseNote`, `notes`, `extraction`, `extracting`,
  `notesExtraction`, `notesProcessing`, `error`, `copied`, `caseFull`,
  `boats`, `people`, `otherCases`, `sailNumberRoles` (`useMemo`), `caseTab`,
  `savingAll` **y también el estado efímero de formularios inline**:
  `partyForm`, `witnessName`, `witnessRole`, `uploadingAttachment` y el ref
  de adjuntos. **Razón:** hoy sobreviven al cambio de pestaña (las pestañas
  se desmontan y montan); moverlos a las pestañas haría perder lo tecleado
  a medias y duplicaría subidas en curso. Los componentes reciben valores y
  callbacks por props. Los handlers (`handleUploadAttachment`,
  `handleProcessAttachments`, `handleLinkCase`, `handleStageParty`, …) y
  `addSuggestedParty`/`addSuggestedWitness`/`useSuggestedDay`/`useSuggestedRace`
  se quedan en el padre (los dos últimos se renombran al pasarlos como
  props, p. ej. `onUseSuggestedDay`; el nombre no afecta al DOM).
- **R-3 Componentes de módulo, nunca definidos dentro de `CaseForm`** (se
  remontarían en cada render y romperían el texto fantasma y el foco).
- **R-4 Mismo montaje condicional** (`{caseTab === 'x' && …}`).
  **`<div className="tab-panel">` lo pinta `CaseForm`** (tiene animación al
  montar); los componentes de pestaña devuelven solo su contenido interno
  (Decision incluye su `section.box` y su `CopyBox` dentro del mismo
  `tab-panel`).
- **R-5 Los refrescos parciales siguen siendo parciales** (nunca
  `reload()`, nunca tocan los textos sin guardar). `refreshParties` conserva
  su asimetría (rehace drafts). No se añade ningún `catch`.
- **R-6 Lógica de negocio en helpers**; los componentes presentan y
  disparan acciones.
- **R-7 `useMemo` de `sailNumberRoles` se conserva en el padre** (identidad
  estable para `GhostTextarea`).
- **R-8 `TabBar` devuelve solo `<nav className="tab-bar tab-bar-pill">`.**
  Los botones Download y Save siguen siendo hermanos dentro de
  `div.tab-bar-row`, fuera del `<nav>`.

## Contrato de `WritingBox` (paso 3)

`WritingBox` pinta **solo** `CopyBox > div.box-body-split >
div.textarea-col + div.suggestions-col`. Recibe `label`, `copyText`,
`copied`, `onCopied`, `textarea` (el `GhostTextarea` ya construido, con sus
`rows`, `box` y `sailNumberRoles`) y `side` (`ReactNode`). El
`div.suggestions-panel` y `PartyReference` van **dentro de `side`** solo en
Facts y Decision. Cada pestaña de redacción recibe `liveCase` por props
(Rules lo necesita para `copyText` y para `onInsertMissing`).

## Plan por pasos — un commit por cada uno (revertible)

**Paso 1a — `caseTabs.ts` + `TabBar.tsx` (mecánico).** `CASE_TABS` y el
tipo `CaseTab` (hoy declarado dentro del componente) pasan a `caseTabs.ts`;
el efecto de `writingTabs` lo importa.
**Paso 1b — `caseDrafts.ts`.** `PartyDraft`, `WitnessDraft`,
`emptyPartyDraft` (exportados), `toPartyDrafts(full)`, `toWitnessDrafts(full)`
(elimina el duplicado). Sin importación circular.
**Paso 1c — refrescos.** Un `refreshCaseParts(keys)` para `jury`,
`linkedCases`, `attachments` y `ruleCitations` (los cuatro con el mismo
patrón `prev ? {...prev, …} : full`); `refreshParties` se queda aparte.
**Paso 2 — pestañas presentacionales con props explícitos.** `ReviewTab`,
`GeneralTab`, `AttachmentsTab`. Lista de props de cada una en el plan.
**Paso 3 — `WritingBox`, una pestaña por commit.** Orden: Procedural,
Conclusion, Facts, Decision, Rules (la más distinta, al final).
**Paso 4 — `PartiesTab`** presentacional (con las tres `<datalist>`, que
solo usa esa pestaña; `boats` y `people` por props).
**Paso 5 (opcional, riesgo alto) — hooks en el padre** (`useNotesExtraction`,
`useCaseSave`), solo si el dueño lo pide tras el paso 4. Los hooks se declaran antes de `if (!caseFull) return`,
conservan la dependencia `[caseTab]` del efecto de notas y su closure, y
exponen `lastProcessedNotes` para sembrarlo en `reload()`.

## Riesgos

- **Regresión silenciosa** sin suite de tests: mitigada por pasos pequeños,
  comparación de DOM y lista de comportamientos.
- **Cierres sobre estado obsoleto:** `handleSaveAll`, `findOrCreateBoat/
  Person` y los refrescos se quedan en el padre y solo se pasan como props.
- **Remontajes:** componentes de módulo, mismas posiciones en el árbol.
- **Espacios y formato:** R-1.
- **Conflicto con SPEC-022:** esta spec va primero; no se editan en paralelo.

## Verificación (por cada paso)

1. `npm run typecheck` y `npm run build` (web) limpios, y `grep` de restos.
2. **Comparación de DOM (mejor que `read_page`, que no ve clases ni
   envolturas):** el script `__snap` de la página calcula, pestaña por
   pestaña, un hash y la longitud del `innerHTML` de `.tab-bar-row`'s
   padre. La línea base se tomó sobre lo **desplegado (`b03ec81`)**, caso
   TEST-01 (con datos, solo lectura) y TEST-02 (vacío). Tras el redeploy de
   cada paso se repite y debe dar **los mismos hashes**; un hash distinto
   señala la pestaña. El `innerHTML` no depende del ancho de ventana (las
   media queries son CSS, que no se toca). No comparables: sugerencias
   que vengan de IA tras pulsar Process y el texto fantasma; no se pulsa
   Process durante la comparación.
3. **Comportamientos que el DOM no captura** (en vivo, caso TEST-02,
   limpiando después): escribir en una caja, cambiar de pestaña y volver
   conserva el texto sin guardar; el foco y el cursor se mantienen al
   teclear (sin remontaje); formulario inline a medias de Parties se
   conserva al cambiar de pestaña; una subida o un Process en curso sigue
   mostrando "Uploading…"/"Processing…" al volver; entrar en una pestaña de
   redacción con notas cambiadas dispara Process **una sola vez** y abrir el
   caso no dispara nada; vincular un caso, subir un adjunto, añadir una
   cita y cambiar el jurado **no tocan** el texto sin guardar (R-5); Save con
   una parte y un testigo nuevos y otra parte eliminada, y recarga; Add de
   sugerencias del formulario de protesta en Parties (con `extraction`
   presente); colapsar una `CopyBox`, cambiar de pestaña y volver la deja
   abierta como hoy; Rules: registrar y quitar una cita, aviso "Insert
   missing"; Review: edición y jurado.
4. **Copy** se verifica solo en localhost si hace falta (en HTTP
   `navigator.clipboard` puede no existir); **Download** se verifica
   abriéndolo.
5. Un commit por paso; **cada paso no está terminado hasta su redeploy y su
   comparación** (Definición de terminado de `CLAUDE.md`). Si un paso falla,
   `git revert` de ese commit.

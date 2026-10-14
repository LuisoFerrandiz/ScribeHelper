# SPEC-024 — Plan

Relacionado: `SPEC-024-refactor-caseform.md` (requisitos y reglas R-1 a R-8).

Ficheros nuevos en `apps/web/src/` (módulo, no dentro de `CaseForm`):

| Fichero | Contenido |
|---|---|
| `caseTabs.ts` | `CASE_TABS: {id: CaseTab, label: string}[]` (9 pestañas, etiquetas literales con `&` como texto) y `type CaseTab` |
| `caseDrafts.ts` | `PartyDraft`, `WitnessDraft`, `emptyPartyDraft`, `toPartyDrafts(full)`, `toWitnessDrafts(full)` |
| `components/TabBar.tsx` | solo `<nav className="tab-bar tab-bar-pill">` con `aria-current={caseTab === id}` y `className={… ? 'active' : undefined}` |
| `components/ReviewTab.tsx` | `section.review-box` + `JurySlots` |
| `components/GeneralTab.tsx` | `section.box.general-box` |
| `components/AttachmentsTab.tsx` | `section.box` de Protest Form(s) |
| `components/WritingBox.tsx` | `CopyBox > .box-body-split > .textarea-col + .suggestions-col` |
| `components/PartiesTab.tsx` | `CopyBox` Parties & Witness + 3 `datalist` |

## Props por componente (todos los valores y handlers siguen en el padre)

- **TabBar:** `caseTab`, `onSelect(tab)`.
- **ReviewTab:** `proceduralMatters/factsFound/conclusion/rulesApplicable/
  decision/informedAt` y sus setters; `caseId`; `eventId`; `jury`;
  `onJuryChange` (= `reloadJury`/`refreshCaseParts('jury')`);
  `findOrCreatePerson`.
- **GeneralTab:** `caseNumber/day/race/withCaseNote` + setters;
  `extraction` (para los botones "Use suggested"); `onUseSuggestedDay`,
  `onUseSuggestedRace`; `linkedCases`; `otherCases`; `onLinkCase`,
  `onRemoveLink`.
- **AttachmentsTab:** `attachments`; `extraction`; `extracting`;
  `uploadingAttachment`; `attachmentInputRef`; `onUpload`, `onRemove`,
  `onProcess`.
- **WritingBox:** `label`, `copyText`, `copied`, `onCopied`, `textarea`,
  `side`.
- **Pestañas de redacción** (se montan en `CaseForm` con `WritingBox`):
  reciben `liveCase`, el texto y su setter, `extraction`, `notesExtraction`,
  `copied/markCopied`, `partyDrafts`+`race` (Facts y Decision),
  `sailNumberRoles` (Facts), `autoProceduralLines` (Procedural),
  `ruleCitations`+handlers (Rules), `informedAt`+setter (Decision).
- **PartiesTab:** `liveCase`; `partyDrafts`; `partyForm` y su setter;
  `witnessDraft`, `witnessName/witnessRole` + setters; `extraction`;
  `boats`; `people`; `copied` (claves `parties` y `witness`) y
  `markCopied`; `onUnstageParty`, `onStageParty`, `onAddSuggestedParty`,
  `onUnstageWitness`, `onStageWitness`, `onAddSuggestedWitness`.

## Estructura final de `CaseForm.tsx`

Estado y refs; `reload`; `refreshCaseParts` + `refreshParties`;
`findOrCreateBoat/Person`; `handleSaveAll`; handlers de adjuntos, notas,
enlaces, partes y testigos, citas; `liveCase`/`autoProceduralLines`;
`return` con cabecera, notas, `tab-bar-row` (`TabBar`, Download, Save) y los
nueve montajes condicionales dentro de `div.tab-panel`.

## Reglas de ejecución

- Un commit por paso; `typecheck` y `build` antes de cada commit.
- Diff revisado con espacios visibles (`git diff -w` además del normal) para
  confirmar que solo se mueve código.
- Tras cada commit: push, "Pull and redeploy" del dueño y comparación de
  DOM con los hashes de línea base. La base se **actualiza solo si el
  cambio de DOM era esperado** (en un refactor puro no lo es).
- No tocar `RulesSuggestions` ni `handleAddRule` más allá de pasarlos como
  props (SPEC-022 los cambiará después).

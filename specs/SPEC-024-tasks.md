# SPEC-024 — Tareas

Estado: pendiente (spec v2 aprobada por el dueño, plan escrito; sin
implementar). Cada paso termina en commit, push, redeploy y comparación de
DOM contra la línea base (TEST-01 y TEST-02, `b03ec81`).

Relacionado: `SPEC-024-refactor-caseform.md`, `SPEC-024-plan.md`.

- [ ] **1a. `caseTabs.ts` + `TabBar.tsx`.** `CaseTab` fuera del componente;
  el efecto de notas importa el tipo.
- [ ] **1b. `caseDrafts.ts`.** Tipos de drafts exportados, `toPartyDrafts`,
  `toWitnessDrafts`; `reload` y `refreshParties` los usan.
- [ ] **1c. `refreshCaseParts`** para `jury`, `linkedCases`, `attachments`,
  `ruleCitations`; `refreshParties` aparte.
- [ ] **2a. `ReviewTab.tsx`.**
- [ ] **2b. `GeneralTab.tsx`.**
- [ ] **2c. `AttachmentsTab.tsx`.**
- [ ] **3a. `WritingBox.tsx` + Procedural Matters.**
- [ ] **3b. Conclusion.**
- [ ] **3c. Facts Found** (con `suggestions-panel`, `PartyReference`,
  `sailNumberRoles`).
- [ ] **3d. Decision** (con "Informed at", `suggestions-panel`,
  `PartyReference` con `race`).
- [ ] **3e. Rules Applicable** (`copyText` = `formatRulesApplicable(liveCase)`,
  `onInsertMissing` con `liveCase`).
- [ ] **4. `PartiesTab.tsx`** (con `datalist`).
- [ ] **5. (opcional) hooks en el padre**, solo si `CaseForm.tsx` > ~500
  líneas tras el paso 4 o si el dueño lo pide.
- [ ] **6. Cierre:** actualizar `issue.md` (ISS-006), entrada en
  `DECISIONS.md` (política de refactor y estructura de componentes) y, si
  se quiere, la sección de arquitectura de `CLAUDE.md`.

Cada tarea 1a-4: typecheck + build, `git diff -w`, commit, push, redeploy
del dueño, comparación de DOM y lista de comportamientos de la spec.

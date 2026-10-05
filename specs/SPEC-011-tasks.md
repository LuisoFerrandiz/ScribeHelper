# SPEC-011 — Tareas

Estado: pendientes, nada implementado todavía.

Relacionado: `SPEC-011-general-parties-split.md` (requisitos),
`SPEC-011-plan.md` (diseño detallado de cada tarea).

Orden de ejecución — secuencial, cada tarea se apoya en la anterior.

- [ ] **1. `CopyBox.tsx` — prop `onSave`/`saving`.** Wrapper
  `box-header-actions` en la cabecera, junto a "Copy". Cambio
  aislado, ningún `CopyBox` existente pasa la prop todavía.
- [ ] **2. CSS — `.box-header-actions`.**
- [ ] **3. `CaseForm.tsx` — `CaseTab` union + barra de pestañas.**
  Miembro `'parties'` nuevo; botón "2. Parties & Witness"; renumeración
  +1 de Procedural Matters/Facts Found/Conclusion/Decision/Review.
- [ ] **4. `CaseForm.tsx` — `saving` a `Record<string, boolean>`,
  `saveField`, `refreshParties`, los 6 handlers de guardado.**
  Sustituyen `handleSaveGeneral`. Ninguno dispara `reload()` genérico.
- [ ] **5. `CaseForm.tsx` — JSX reestructurado.** `caseTab === 'general'`
  se queda solo con la sección "General" (sin `CopyBox`); bloque
  `caseTab === 'parties'` nuevo con el `CopyBox` de Parties & Witness
  (Save en su cabecera, quita el texto "Parties and witnesses save
  with the Save button above."); los 4 `CopyBox` de texto libre ganan
  `onSave`/`saving`; `caseTab === 'review'` gana cabecera con Save.
- [ ] **6. Verificar.** `npm run typecheck` (web) limpio; probado en
  vivo: 8 pestañas renumeradas correctamente; escenario RF-005 (texto
  sin guardar en una pestaña sobrevive a un guardado en otra, en
  ambas direcciones — General↔Parties y Facts Found↔Procedural
  Matters); testigo nuevo en Parties & Witness obtiene id real tras
  guardar sin duplicarse; Review guarda las 4 cajas juntas y comparte
  estado con las pestañas individuales en ambas direcciones; Rules
  Applicable y With case(s) siguen actuando al instante sin Save
  propio. Revisión con el agente `reviewer`.

## Fuera de esta tanda de tareas

- Corregir que `handleLinkCase`/`handleRemoveLink`/
  `handleUploadAttachment`/`handleRemoveAttachment`/`handleAddRule`/
  `handleRemoveRule` sigan llamando al `reload()` genérico (reseedea
  los 4 textos libres desde servidor) — hallazgo colateral, candidato
  a spec de seguimiento (`reloadAttachments`/`reloadLinkedCases`/
  `reloadRuleCitations`, cada uno acotado).
- Tocar `SPEC-004-general-parties.md`.

# SPEC-011 — Tareas

Estado: terminado. Implementado, verificado en vivo contra
`http://192.168.1.105:8086/` (entorno desplegado, no solo localhost),
commit `0155993` pusheado a `master`, redeploy confirmado en Portainer,
reviewer **APROBADO** en segundo pase contra el servidor desplegado
(RF-005/RF-007 reconfirmados ahí, texto corregido del hint de
extracción verificado literal, 8 pestañas numeradas correctas,
coherencia D-029 — "1. General" sin Copy, "2. Parties & Witness" con
Save+Copy juntos — confirmada). Cumple "Definición de terminado" de
`CLAUDE.md` en los 4 puntos.

Relacionado: `SPEC-011-general-parties-split.md` (requisitos),
`SPEC-011-plan.md` (diseño detallado de cada tarea).

Orden de ejecución — secuencial, cada tarea se apoya en la anterior.

- [x] **1. `CopyBox.tsx` — prop `onSave`/`saving`.** Wrapper
  `box-header-actions` en la cabecera, junto a "Copy". `onSave`
  opcional — "Rules Applicable" sigue sin pasarla, sin cambios.
- [x] **2. CSS — `.box-header-actions`.** Más fix `.review-box
  h3:first-of-type` (era `:first-child`, roto por la nueva cabecera
  `.box-header` en Review) y `.review-box .box-header`.
- [x] **3. `CaseForm.tsx` — `CaseTab` union + barra de pestañas.**
  Miembro `'parties'` nuevo; botón "2. Parties & Witness"; renumeración
  +1 de Procedural Matters/Facts Found/Conclusion/Decision/Review.
- [x] **4. `CaseForm.tsx` — `saving` a `Record<string, boolean>`,
  `saveField`, `refreshParties`, los 6 handlers de guardado.**
  Sustituyen `handleSaveGeneral`. Ninguno dispara `reload()` genérico;
  `refreshParties()` solo toca `caseFull.parties`/`caseFull.witnesses`
  y lo derivado (`initiator`/`respondent`/`witnessDraft`) — confirmado
  por el reviewer, nunca `caseNumber`/`day`/`race`/`informedAt` ni los
  4 `useState` de texto libre.
- [x] **5. `CaseForm.tsx` — JSX reestructurado.** `caseTab === 'general'`
  se queda solo con la sección "General" (sin `CopyBox`); bloque
  `caseTab === 'parties'` nuevo con el `CopyBox` de Parties & Witness
  (Save en su cabecera, quita el texto "Parties and witnesses save
  with the Save button above."); los 4 `CopyBox` de texto libre ganan
  `onSave`/`saving`; `caseTab === 'review'` gana cabecera con Save.
- [x] **6. Verificar.** `npm run typecheck` (web) / `npm run build`
  (api) limpios. Probado en vivo contra caso real TEST-01 (dev server
  local, no aún contra el entorno desplegado):
  - 8 pestañas renumeradas correctamente (0-7).
  - **RF-005**: texto sin guardar en una pestaña sobrevive a un
    guardado independiente en otra, en ambas direcciones
    (General↔Parties, Facts Found↔Procedural Matters) — confirmado
    comparando persistido vs. no persistido vía `fetch` directo.
  - **RF-007**: Review guarda las 4 cajas juntas, incluyendo texto
    previamente sin guardar en pestañas individuales.
  - Rules Applicable y With case(s) siguen actuando al instante sin
    Save propio.
  - Revisión del agente `reviewer`: primer pase **CAMBIOS NECESARIOS**
    — un hallazgo bloqueante: `CaseForm.tsx` conservaba el texto
    "Processed. Suggestions from it are offered on the General &
    Parties and Procedural Matters tabs" tras el protest form, con el
    nombre de pestaña viejo ("General & Parties" ya no existe) y sin
    mencionar Facts Found/Conclusion/Decision (que también reciben
    sugerencias, D-029 regla 2). Corregido: texto actualizado a
    "General, Parties & Witness, Procedural Matters, Facts Found,
    Conclusion and Decision tabs". `npm run typecheck` reconfirmado
    limpio tras el fix. Pendiente segundo pase del reviewer sobre el
    fix puntual (no bloqueante, cambio textual aislado).
  - Nota del reviewer: verificación en vivo fue contra localhost, no
    contra `http://192.168.1.105:8086/` — pendiente confirmar tras
    commit + push + "Pull and redeploy" en Portainer, por
    `CLAUDE.md` → "Definición de terminado".

## Fuera de esta tanda de tareas

- Corregir que `handleLinkCase`/`handleRemoveLink`/
  `handleUploadAttachment`/`handleRemoveAttachment`/`handleAddRule`/
  `handleRemoveRule` sigan llamando al `reload()` genérico (reseedea
  los 4 textos libres desde servidor) — hallazgo colateral, candidato
  a spec de seguimiento (`reloadAttachments`/`reloadLinkedCases`/
  `reloadRuleCitations`, cada uno acotado).
- Tocar `SPEC-004-general-parties.md`.

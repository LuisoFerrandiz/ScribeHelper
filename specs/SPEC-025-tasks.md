# SPEC-025 — Tareas

Estado (2026-10-14): **tareas 0 a 10 hechas**; commit y push hechos;
falta redeploy y verificacion en vivo (11).

Relacionado: `SPEC-025-frases-con-huecos.md`, `SPEC-025-plan.md`.

- [x] **0. `reviewer` sobre la spec v1** y ajustes (v2). Hecho.
- [x] **1. `phraseGaps.ts`** — `normalizePhraseText`, `phraseGaps`, `nextGap`,
  `prevGap`, `replaceParty`.
- [x] **2. Script desechable de prueba** (`scratchpad/check_gaps.ts`) sobre las
  333 frases de la base local y los casos de la spec (ids 21, 29, 30, 52, 71,
  77, 135, 146, 168, 210, 244, 245, 247, 261). Debe pasar antes de seguir.
- [x] **3. `usePhraseCompletions.ts`** — carga única por caja, `complete(text)`,
  clave de recarga. Prueba con el mismo script (prefijos, desempate).
- [x] **4. `GhostTextarea.tsx`** — `forwardRef` + `insertAtCaret`, zona y
  sesión (Tab / Shift+Tab / Escape), efecto de layout de selección, seguimiento
  de la zona, `onBlur` con `data-gap-ui`, props `phraseBox` y orden de fuentes
  del fantasma, aceptar abre zona.
- [x] **5. `PartyBar`** (en `components/`) y su conexión en `GhostTextarea`.
- [x] **6. `SuggestionList.tsx`** — `onInsertPhrase`, `mousedown` sin foco,
  ayuda de RF-009, `onPhraseSaved`.
- [x] **7. `CaseForm.tsx`** — cuatro referencias, `onInsertPhrase`, `phraseBox`
  y `refreshKey`; Rules Applicable intacto.
- [x] **8. `styles.css`** — `.gap-hint`, `.party-bar`.
- [x] **9. `DECISIONS.md`** — D-036 (append-only).
- [x] **10. Verificar en local:** `npm run typecheck` y `build` (web), script de
  las tareas 2-3, y prueba en el navegador con la API local (copia de datos).
- [ ] **11. Commit y push a `master` (solo cuando el dueño lo ordene).** Tras su
  redeploy, verificación en vivo según la spec (TEST-02, limpiando después) y
  cierre en `issue.md`.

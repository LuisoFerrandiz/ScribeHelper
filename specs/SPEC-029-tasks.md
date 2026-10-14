# SPEC-029 — Tareas

Estado (2026-10-14): todo hecho; desplegado `a2b1324` y verificado en vivo (migración aplicada, aviso tras Save sin recargar, no avisa sin guardar ni en Decision/Rules, Mark as reviewed, visible colapsada, limpieza a NULL).
falta commit (6) y verificación en vivo.

- [x] **0. `reviewer` sobre la spec** y ajustes (v2).
- [x] **1. API:** migración, `stampOnChange`, ruta `box-reviewed`.
- [x] **2. Web:** `staleBoxes.ts`, `StaleNote`, `CopyBox`/`WritingBox`, tipos, `api`, `CaseForm`.
- [x] **3. Local:** `npm run build` (api), `typecheck` y `build` (web), script
  `check_stale.ts`, API local con curl (8 casos).
- [x] **4. D-040.**
- [x] **5. Commit y push (solo cuando el dueño lo ordene)**, redeploy.
  **Antes del redeploy, copia de `data/db`** (migración con ALTER, aditiva).
- [x] **6. Verificar en vivo** (TEST-02, con limpieza), cerrar en `issue.md` y
  actualizar la memoria.

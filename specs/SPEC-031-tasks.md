# SPEC-031 — Tareas

Estado (2026-10-14): todo hecho; desplegado `bbf977e` y verificado en vivo con el modelo (propone con cita literal, inyección ignorada, Accept uno a uno y fuera de orden, edición invalida, alternativas no se ofrecen, hueco sin dato en el resumen).
de IA en local, el modelo solo se prueba en vivo); falta commit (6) y
verificación en vivo (7).

- [x] **0. `reviewer` sobre la spec** y ajustes (v2, con medición de la librería).
- [x] **1. API:** `fillGaps.ts`, ruta, `validateFills`.
- [x] **2. Web:** `gapFill.ts`, `GapFillPanel`, `replaceValue`, `below`, `CaseForm`.
- [x] **3. Scripts:** `check_fill.ts` (17 casos), `check_gapfill.ts` (13 casos).
- [x] **4. Local:** `npm run build` (api), `typecheck` y `build` (web).
- [x] **5. D-042.**
- [x] **6. Commit y push (solo cuando el dueño lo ordene)**, redeploy. Sin
  cambios de datos.
- [x] **7. Verificar en vivo** (TEST-02, sin guardar; llamada real al modelo),
  cerrar F4 en `issue.md` y actualizar la memoria.

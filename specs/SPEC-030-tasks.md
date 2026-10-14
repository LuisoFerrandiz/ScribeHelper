# SPEC-030 — Tareas

Estado (2026-10-14): todo hecho; desplegado `42dd98d` y verificado en vivo con el modelo (Conclusion y Decision coherentes con los hechos, Rules sin dígitos, Facts y Procedural sin contexto, inyección en hechos sin efecto).
de IA en local, el modelo solo se prueba en vivo); falta commit (5) y
verificación en vivo (6).

- [x] **0. `reviewer` sobre la spec** y ajustes (v2).
- [x] **1. API:** `chainContextFor`, prompt y mensaje, ruta.
- [x] **2. Web:** `ChainContext`, `completeInline`, `GhostTextarea`, `CaseForm`.
- [x] **3. Local:** `npm run build` (api), `typecheck` y `build` (web), script `check_chain.ts` (11 casos).
- [x] **4. D-041.**
- [x] **5. Commit y push (solo cuando el dueño lo ordene)**, redeploy. Sin
  cambios de datos.
- [x] **6. Verificar en vivo** (TEST-02, sin guardar; llamadas reales al modelo),
  cerrar F6 en `issue.md` y actualizar la memoria.

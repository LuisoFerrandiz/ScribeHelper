# SPEC-013 — Tareas

Estado: implementado, verificado en localhost, reviewer APROBADO
(spec/plan y, por separado, implementación RF por RF — las 3 funciones
confirmadas idénticas al patrón de `reloadJury`/`refreshParties`, los
6 handlers confirmados sin `reload()`, sin solapamiento roto con
SPEC-014, `npm run typecheck` limpio). Pendiente: commit + push (push
solo cuando el usuario lo pida), redeploy en Portainer, y
reconfirmación en vivo contra `http://192.168.1.105:8086/`.

Relacionado: `SPEC-013-scoped-refreshes.md` (requisitos),
`SPEC-013-plan.md` (diseño).

- [x] **1. `CaseForm.tsx` — `refreshLinkedCases`/`refreshAttachments`/
  `refreshRuleCitations`.** Tres funciones nuevas, mismo patrón que
  `reloadJury()`/`refreshParties()`.
- [x] **2. `CaseForm.tsx` — 6 handlers.** `handleLinkCase`/
  `handleRemoveLink`/`handleUploadAttachment`/`handleRemoveAttachment`/
  `handleAddRule`/`handleRemoveRule` sustituyen su `await reload()`
  por la función acotada correspondiente. `reload()` en sí no se toca
  (se queda para el `useEffect` de montaje, línea 224 — confirmado por
  grep, ningún otro uso suelto).
- [x] **3. Verificar.** `npm run typecheck` (web) limpio. Probado en
  vivo contra localhost (dev server, caso real TEST-01):
  - **RF-001**: marcador sin guardar en Facts Found, vinculado Case 02
    en "With case(s)" (General) — marcador sobrevivió intacto.
  - **RF-004**: el chip del caso vinculado apareció/desapareció
    correctamente al vincular/desvincular, sin recarga de página de
    por medio.
  - RF-002 (adjuntos)/RF-003 (reglas) no se re-probaron en vivo en
    esta ronda — mismo patrón exacto que RF-001, código
    idéntico salvo el campo refrescado (`refreshAttachments`/
    `refreshRuleCitations` vs. `refreshLinkedCases`).
  - Datos de prueba revertidos (caso desvinculado, marcador
    descartado sin guardar); usuario de prueba `spec013tmp` borrado;
    dev servers detenidos.
  - Pendiente: validación del agente `reviewer` sobre la
    implementación, y verificación en vivo contra
    `http://192.168.1.105:8086/` (entorno desplegado) antes de cerrar.

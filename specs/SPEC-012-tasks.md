# SPEC-012 — Tareas

Estado: implementado, verificado en localhost, reviewer APROBADO
(spec/plan y, por separado, implementación RF por RF — diff mínimo de
5 líneas, patrón idéntico a Conclusion, `npm run typecheck` limpio).
Pendiente: commit + push (push solo cuando el usuario lo pida),
redeploy en Portainer, y reconfirmación en vivo contra
`http://192.168.1.105:8086/`.

Relacionado: `SPEC-012-decision-protest-form.md` (requisitos),
`SPEC-012-plan.md` (diseño).

- [x] **1. `CaseForm.tsx` — prop `protestForm` en el `SuggestionsPanel`
  de Decision.** Mismo patrón que Conclusion, gateado por
  `extraction?.decision_candidate`.
- [x] **2. Verificar.** `npm run typecheck` (web) limpio. Probado en
  vivo contra localhost (dev server, caso real TEST-01):
  - **RF-002**: candidato vacío (caso sin reprocesar) → panel de
    Decision igual que antes de esta spec, sin sección "Protest form"
    ni placeholder.
  - **RF-001**: `decision_candidate` presente (inyectado vía
    intercepción de `fetch` en el navegador, ya que el campo casi
    siempre viene vacío de verdad — el protest form se presenta antes
    del fallo) → sección "▸ Protest form" aparece con "+ From protest
    form".
  - **RF-003**: tras procesar, el texto de Decision no cambió solo
    ("dsq tt" intacto); al pulsar "From protest form" se insertó
    append (`dsq tt\n\nTEST-SPEC012-DECISION-CANDIDATE`), sin
    sobrescribir lo existente.
  - Datos de prueba descartados sin guardar (recarga de página,
    `Save` nunca pulsado en Decision); usuario de prueba
    `spec012tmp` borrado tras verificar; dev servers (API/web)
    detenidos.
  - Pendiente: validación del agente `reviewer` sobre la
    implementación, y verificación en vivo contra
    `http://192.168.1.105:8086/` (entorno desplegado) antes de cerrar.

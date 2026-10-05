# SPEC-014 — Tareas

Estado: implementado, verificado en localhost, reviewer APROBADO
(spec/plan y, por separado, implementación RF por RF — `handleSaveAll`
confirmado completo contra el antiguo `handleSaveParties` línea por
línea, ningún Save por pestaña sobrevive, `CopyBox.tsx` sin código
muerto, `npm run typecheck`/`npm run build` limpios). Pendiente:
commit + push (push solo cuando el usuario lo pida), redeploy en
Portainer, y reconfirmación en vivo contra
`http://192.168.1.105:8086/`.

Relacionado: `SPEC-014-unified-save.md` (requisitos),
`SPEC-014-plan.md` (diseño).

- [x] **1. `CaseForm.tsx` — `savingAll` sustituye `saving`.**
- [x] **2. `CaseForm.tsx` — `handleSaveAll`.** Sustituye `saveField` +
  los 7 handlers de guardado por pestaña; cuerpo de Parties/testigos
  movido tal cual desde `handleSaveParties`.
- [x] **3. `CaseForm.tsx` — botón "Save" junto a Download decision.**
- [x] **4. `CaseForm.tsx` — sección "General" sin `<form>`/submit
  propio.**
- [x] **5. `CaseForm.tsx` — quitar `onSave`/`saving` de los 5
  `CopyBox`** (Parties & Witness + las 4 cajas de texto libre).
- [x] **6. `CaseForm.tsx` — pestaña "Review" sin cabecera con Save.**
- [x] **7. `CopyBox.tsx` — quitar props `onSave`/`saving`.**
- [x] **8. Verificar.** `npm run typecheck` (web) limpio. Probado en
  vivo contra localhost (dev server, caso real TEST-01):
  - **RF-001**: botón "Save" único visible junto a "Download decision
    (.html)" en `.tab-bar-row`, fuera de cualquier pestaña.
  - **RF-003**: confirmado programáticamente — exactamente 1 botón
    "Save"/"Saving…" visible en pantalla al recorrer las 7 pestañas
    (2 a 7), nunca más de uno.
  - **RF-002/RF-004**: marcador de prueba escrito en Facts Found,
    guardado con el único botón, confirmado persistido tras recargar
    la página; revertido y re-guardado para dejar el dato real
    intacto.
  - Lógica de Parties & Witness/testigos no se re-probó en vivo (es
    copia literal, sin cambios, de la ya verificada en SPEC-011).
  - Usuario de prueba `spec014tmp` borrado tras verificar; dev
    servers (API/web) detenidos.
  - Pendiente: validación del agente `reviewer` sobre la
    implementación, y verificación en vivo contra
    `http://192.168.1.105:8086/` (entorno desplegado) antes de cerrar.

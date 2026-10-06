# SPEC-015 — Tareas

Estado: implementado, verificado en localhost, reviewer APROBADO
(spec/plan tras 2 fixes y, por separado, implementación RF por RF —
orden borrado-ficheros-antes-que-fila confirmado, `skipDelete` sin
romper otros prefixes, sin colisión de ruta, `npm run build`/
`npm run typecheck` limpios). Pendiente: commit + push (push solo
cuando el usuario lo pida), redeploy en Portainer, y reconfirmación en
vivo contra `http://192.168.1.105:8086/`.

Relacionado: `SPEC-015-delete-case.md` (requisitos),
`SPEC-015-plan.md` (diseño).

- [x] **1. `crud.ts` — opción `skipDelete`.**
- [x] **2. `caseDelete.ts` (nuevo) — `DELETE /cases/:id`,
  `requireAdmin`, limpia ficheros de adjunto antes de borrar la
  fila.**
- [x] **3. `index.ts` — `skipDelete: true` para `cases`,
  `registerCaseDeleteRoute(app)`.**
- [x] **4. `api.ts` — `deleteCase`.**
- [x] **5. `CaseList.tsx` — prop `user`, columna/botón "Remove" solo
  para admin, `window.confirm`, `stopPropagation`.**
- [x] **6. `App.tsx` — pasa `user` a `CaseList`.**
- [x] **7. Verificar.** `npm run build` (api) / `npm run typecheck`
  (web) limpios. Probado en vivo contra localhost (caso de prueba
  desechable `D1`, evento `SPEC015 Test Event`, con party/testigo/
  cita de regla/jurado/adjunto reales):
  - **RF-005**: `DELETE /cases/:id` con sesión no-admin → `403`
    (confirmado por API directa).
  - **RF-002**: botón Remove muestra el diálogo con el texto exacto
    "Delete case D1 (SPEC015 Test Event)? This cannot be undone."
    (confirmado interceptando `window.confirm`); Cancelar
    (`confirm` → `false`) deja el caso en el listado.
  - **RF-003**: confirmar (`confirm` → `true`) borra el caso, que
    desaparece del listado; verificado por BD que `witness`/
    `case_rule_citation`/`case_jury_member`/`case_attachment` para
    ese `case_id` quedan en 0 filas, sin huérfanos.
  - **RF-004**: el fichero del adjunto en
    `data/case_attachments/originals/` desaparece del disco tras
    borrar.
  - RF-001 no se re-probó visualmente con un usuario no-admin en el
    navegador (se infiere del código — `user.role === 'admin'` gatea
    tanto la columna como el botón — y RF-005 ya prueba el guard real
    del lado servidor).
  - Datos de prueba limpiados (evento de prueba borrado —
    cascada también el `jury_member` del pool —, persona de prueba y
    usuarios `spec015admin`/`spec015user` borrados); dev servers
    detenidos.
  - Pendiente: validación del agente `reviewer` sobre la
    implementación, y verificación en vivo contra
    `http://192.168.1.105:8086/` (entorno desplegado) antes de cerrar.

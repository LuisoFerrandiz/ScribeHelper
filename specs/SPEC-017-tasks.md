# SPEC-017 — Tareas

Estado: implementado, verificado en localhost con llamadas reales de
IA, reviewer APROBADO (spec/plan tras fixes y, por separado,
implementación RF por RF — guardia de arranque desarmado confirmado,
guardia síncrona confirmada, posición de la caja fuera de pestaña
confirmada, `notes` confirmado ausente de `format.ts`, consulta de
barcos tolerante a varios initiators/respondents confirmada, `npm run
build`/`npm run typecheck` limpios). Pendiente: commit + push (push
solo cuando el usuario lo pida), redeploy en Portainer (la migración
se aplica sola al arrancar el contenedor), y reconfirmación en vivo
contra `http://192.168.1.105:8086/`.

Relacionado: `SPEC-017-hearing-notes.md` (requisitos),
`SPEC-017-plan.md` (diseño).

Orden de ejecución — backend primero (igual que SPEC-016).

- [x] **1. `schema.sql` — columna `notes` en `protest_case`.**
- [x] **2. `migrate.ts` — `ALTER TABLE` guardado por
  `PRAGMA table_info`.** Idempotencia verificada: corrido dos veces
  contra una copia de la BD real, la columna se añade una sola vez.
- [x] **3. `index.ts` — `notes` en los campos de
  `registerCrud(app, 'cases', ...)`.**
- [x] **4. `apps/api/src/ai/extractNotes.ts` (nuevo) —
  `extractFromNotes`, mismo pipeline que `extractFromAttachments`.**
- [x] **5. `apps/api/src/routes/extractNotes.ts` (nuevo) —
  `POST /cases/:id/extract-notes`.**
- [x] **6. `index.ts` — registra la ruta nueva.**
- [x] **7. `types.ts` — `CaseRow.notes`, `NotesExtraction`.**
- [x] **8. `api.ts` — `extractNotes`.**
- [x] **9. `SuggestionsPanel.tsx` — prop `notesForm`, sección
  "Hearing notes".**
- [x] **10. `CaseForm.tsx` — estado `notes`/`notesExtraction`/
  `notesProcessing`/`lastProcessedNotes` (ref)/`processingRef`
  (ref, guardia síncrona contra llamadas solapadas).**
- [x] **11. `CaseForm.tsx` — `handleProcessNotes`, `useEffect` de
  disparo automático en cambio de pestaña.**
- [x] **12. `CaseForm.tsx` — `notes` en `reload()` (también
  inicializa `lastProcessedNotes.current` al valor ya guardado, no a
  vacío) y en el `PATCH` de `handleSaveAll`.**
- [x] **13. `CaseForm.tsx` — JSX caja "Hearing notes", entre
  `case-header`/error y `tab-bar-row`.**
- [x] **14. `CaseForm.tsx` — prop `notesForm` en los 4
  `<SuggestionsPanel>` de Procedural Matters/Facts Found/Conclusion/
  Decision.**
- [x] **15. Verificar.** `npm run build` (api) / `npm run typecheck`
  (web) limpios; migración probada idempotente (copia de prueba +
  aplicada también a la BD de desarrollo real). Probado en vivo contra
  localhost con llamadas reales a la IA (caso de prueba desechable
  `N1`, evento `SPEC017 Test Event`, initiator ITA 32004/respondent
  ITA 31929 reales), usando el propio ejemplo del dueño ("después de
  la salida ambos OCS 004 arriba para volver, 929 se para proa al
  viento"):
  - **RF-001**: caja "Hearing notes" confirmada entre la cabecera del
    caso y la barra de pestañas.
  - **RF-002**: `notes` y el `facts_found` insertado confirmados
    persistidos en BD tras Save.
  - **RF-003/RF-004**: botón Process deshabilitado sin texto; cambiar
    a Facts Found SIN pulsar Process disparó el análisis solo
    (confirmado — nunca se pulsó el botón manualmente).
  - **RF-005**: "004" resuelto a "ITA 32004" (initiator), "929"
    resuelto a "ITA 31929" (respondent) — ambos correctos, sin
    inventar.
  - **RF-006**: resultado en inglés ("After the start, both boats
    were on the course side (OCS).", etc.) pese a la nota en español.
  - **RF-007**: confirmado con precisión — la fuente "Hearing notes"
    solo apareció en Facts Found (única caja con contenido real para
    esta nota); Procedural Matters/Conclusion/Decision sin la sección
    (sin candidato, comportamiento correcto, no un fallo de
    uniformidad — la fuente está disponible en las 4, se renderiza
    solo cuando hay contenido).
  - **RF-008**: textarea de Facts Found vacío tras el auto-proceso
    (nada insertado solo); clic en una línea sugerida insertó el
    texto correctamente.
  - **RF-009**: confirmado que el `.html` exportado no contiene el
    texto de las notas.
  - RF-004b (sin llamadas solapadas) no se probó en vivo de forma
    determinista (requiere condición de carrera difícil de forzar de
    forma fiable vía automatización) — confirmado por lectura de
    código: `processingRef` se fija de forma síncrona antes de
    cualquier `await`.
  - Datos de prueba limpiados (evento de prueba borrado — cascada
    también caso/parties —, boats huérfanos y usuario `spec017tmp`
    borrados, con cuidado de no tocar el boat real `ITA 32004` ya
    usado por TEST-01); dev servers detenidos.
  - Pendiente: validación del agente `reviewer` sobre la
    implementación, y verificación en vivo contra
    `http://192.168.1.105:8086/` (entorno desplegado, tras "Pull and
    redeploy" — la migración se aplicará sola) antes de cerrar.

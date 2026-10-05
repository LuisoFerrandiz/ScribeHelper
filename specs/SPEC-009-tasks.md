# SPEC-009 — Tareas

Estado: implementado, verificado en vivo, reviewer APROBADO. Pendiente
commit + push (push solo cuando el usuario lo pida) y redeploy en
Portainer.

Relacionado: `SPEC-009-repaso-lectura.md` (requisitos), `SPEC-009-plan.md`
(diseño detallado de cada tarea).

- [x] **1. Backend — `person_id` en `GET /cases/:id/full`.**
  `caseDetail.ts` añade `case_jury_member.person_id` al `SELECT` de
  `jury`; `types.ts` (`CaseFull.jury`) gana el campo.
- [x] **2. `api.ts` — `updateCaseJuryMember`.** Wrapper sobre el `PUT
  /case-jury-members/:id` existente.
- [x] **3. Backend — capturar `UNIQUE` también en `PUT` de `crud.ts`.**
  Mismo `try/catch` que el `POST`; verificado con un `PUT` forzado por
  API a un `person_id` ya ocupado por otro cuadro del mismo caso → 409
  `{error: 'duplicate'}`.
- [x] **4. `JurySlots.tsx` (componente nuevo).** 5 cuadros, `select`
  por cuadro excluyendo jueces ya sentados en otro cuadro del mismo
  caso (`optionsFor`), checkbox Chairman (uno a la vez), formulario
  "+ New judge" siempre visible; `onJuryChange` y `findOrCreatePerson`
  recibidos como props, sin duplicar lógica.
- [x] **5. Pestaña "6. Review" en `CaseForm.tsx`.** `CaseTab` gana
  `'review'`; botón al final de la barra; panel con las 4 cajas +
  `<JurySlots />`; `reloadJury()` nueva, actualiza solo
  `caseFull.jury`, nunca los `useState` de texto.
- [x] **6. CSS.** `.jury-slots-grid`, `.jury-slot`,
  `.jury-slot-chairman`, `.review-box` en `styles.css`, tokens
  existentes, sin colores nuevos.
- [x] **7. Verificar.** `npm run typecheck` (web) / `npm run build`
  (api) limpios. Probado en vivo contra caso real TEST-02 (clics
  reales en el navegador, dev server local):
  - Las 4 cajas comparten estado con sus pestañas propias.
  - **RF-007**: texto sin guardar en Facts Found sobrevivió intacto
    tras asignar/cambiar jurado en la misma visita (confirmado
    comparando el valor en pantalla antes/después).
  - **RF-004**: marcar Chairman en un cuadro desmarca el otro —
    confirmado contra backend vía `fetch` directo (Ana 1→0, Luis
    0→1).
  - **RF-008**: un juez ya sentado no aparece como opción en otro
    cuadro (confirmado con Ana/Luis preexistentes de datos reales);
    `PUT` forzado a un duplicado devuelve 409 sin crash.
  - **RF-005**: "+ New judge" creó persona + la asignó al primer
    hueco libre (slot 3, person_id nuevo), visible en la UI y en el
    pool de todos los `<select>`.
  - Datos de prueba limpiados tras verificar (persona y
    `jury_member`/`case_jury_member` de prueba borrados, chairman de
    Ana restaurado).
  - Revisión del agente `reviewer`: **VEREDICTO APROBADO**, los 8 RF
    confirmados contra el código real línea por línea; sin hallazgos
    bloqueantes. Dos notas opcionales, no bloqueantes: `firstEmptyIndex`
    en `handleAddJudge` depende de que `jury` ya esté actualizado al
    hacer clic (frágil si se añade concurrencia, no es bug hoy);
    `handleSlotChange`/`handleChairmanChange` podrían compartir un
    mapeo de error en vez de repetir `.includes('duplicate')` (no
    amerita cambio ahora).

## Fuera de esta tanda de tareas

- Número de jueces configurable (`JURY_SLOT_COUNT` sigue siendo una
  constante de código).
- Reordenar los 5 cuadros a mano.
- Configuración del HTML exportado — pendiente, lo decide el dueño más
  adelante.

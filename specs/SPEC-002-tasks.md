# SPEC-002 — Tareas

Estado: pendientes, nada implementado todavía.

Relacionado: `SPEC-002-nuevo-caso.md` (requisitos), `SPEC-002-plan.md`
(diseño detallado de cada tarea).

Orden de ejecución — cada tarea asume terminadas las anteriores. Las
tareas 3-5 dependen de que `CaseList.tsx` exista (tareas de SPEC-001)
— si SPEC-001 no está construido todavía cuando se retome esto, o se
construye `CaseList.tsx` primero, o se engancha el botón "New case" en
lo que haga de pantalla de entrada en ese momento.

- [ ] **1. Esquema.** Añadir `CREATE UNIQUE INDEX IF NOT EXISTS
  idx_case_number_per_event ON protest_case(event_id, case_number);`
  a `apps/api/db/schema.sql`.
- [ ] **2. Backend — `crud.ts`.** Envolver el insert del handler
  genérico `POST` en try/catch; devolver `409 { error: 'duplicate' }`
  si la causa es una violación del índice único.
- [ ] **3. Frontend — `NewCaseDialog.tsx`.** Componente nuevo: campo
  regatta texto/select/nueva-regata según corresponda, campo número de
  caso, comprobación previa de duplicado en frontend, envío → crear
  evento (si es nuevo) + crear caso, `onCreated`/`onClose`.
- [ ] **4. Estilos.** Reglas `dialog`/`dialog::backdrop` en
  `styles.css`.
- [ ] **5. Conectar con `CaseList.tsx`** (coordinar con la tarea 6 de
  SPEC-001 — el botón "New case" abre este diálogo en vez de cualquier
  formulario inline).
- [ ] **6. Verificar** (ver `SPEC-002-plan.md` → Verificación), luego
  commit + push, avisar para redeploy.

## Fuera de esta tanda de tareas

- Día, carrera, partes, testigos dentro del caso.
- Editar una regata existente.
- Cualquier cosa del alcance de SPEC-001 más allá del botón "New
  case" en sí.

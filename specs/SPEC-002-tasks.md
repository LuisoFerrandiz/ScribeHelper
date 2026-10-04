# SPEC-002 — Tareas

Estado: pendientes, nada implementado todavía.

Relacionado: `SPEC-002-nuevo-caso.md` (requisitos), `SPEC-002-plan.md`
(diseño detallado de cada tarea).

Orden de ejecución — cada tarea asume terminadas las anteriores. Las
tareas 3-5 dependen de que `CaseList.tsx` exista (tareas de SPEC-001)
— si SPEC-001 no está construido todavía cuando se retome esto, o se
construye `CaseList.tsx` primero, o se engancha el botón "New case" en
lo que haga de pantalla de entrada en ese momento.

- [x] **1. Esquema.** Ya cumplido de antemano — `protest_case` ya
  tenía `UNIQUE (event_id, case_number)` como constraint de tabla
  (`apps/api/db/schema.sql:81`), confirmado también en la DB de
  desarrollo real. La premisa de esta tarea (proponer un
  `CREATE UNIQUE INDEX` nuevo) estaba desactualizada; nada que añadir.
- [x] **2. Backend — `crud.ts`.** Insert del handler genérico `POST`
  envuelto en try/catch; devuelve `409 { error: 'duplicate' }` si el
  mensaje contiene `UNIQUE constraint failed`.
- [x] **3. Frontend — `NewCaseDialog.tsx`.** Campo regatta
  texto/select/nueva-regata, campo número de caso, comprobación previa
  de duplicado en frontend, captura el 409 del backend como fallback,
  `onCreated`/`onClose`.
- [x] **4. Estilos.** `.new-case-dialog`/`.new-case-dialog::backdrop`/
  `.new-case-dialog-actions` en `styles.css`.
- [x] **5. Conectar con `CaseList.tsx`.** El diálogo quedó encapsulado
  dentro de `CaseList.tsx` (estado `dialogOpen` propio, deriva
  `events`/`existingCases` de las filas ya cargadas) en vez de pasar
  por un prop en `App.tsx` — ver `SPEC-002-plan.md` → Follow-up.
- [x] **6. Verificar.** `npm run typecheck`/`npm run build` limpios;
  probado en vivo en local: select con regatas + "New regatta…",
  duplicado bloqueado (frontend), Escape cierra sin crear, nueva
  regata + caso navega directo al caso creado. Revisión con el agente
  `reviewer`: VEREDICTO APROBADO, los 8 RF cumplidos, camino 409
  (dos pestañas) confirmado por código. Pendiente: commit + push,
  avisar para redeploy.

## Fuera de esta tanda de tareas

- Día, carrera, partes, testigos dentro del caso.
- Editar una regata existente.
- Cualquier cosa del alcance de SPEC-001 más allá del botón "New
  case" en sí.

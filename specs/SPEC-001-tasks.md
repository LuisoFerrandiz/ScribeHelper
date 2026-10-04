# SPEC-001 — Tareas

Estado: pendientes, nada implementado todavía.

Relacionado: `SPEC-001-pantalla-de-entrada.md` (requisitos),
`SPEC-001-plan.md` (diseño detallado de cada tarea),
`SPEC-002-nuevo-caso.md` (popup "New case" — su propia tanda de tareas
aparte, no incluida aquí).

Orden de ejecución — cada tarea asume terminadas las anteriores.

- [ ] **1. Spec.** Actualizar `SPEC-001-pantalla-de-entrada.md`:
  mover las 4 preguntas resueltas de `[POR DEFINIR]` a "Decisiones
  técnicas"; rellenar "Tareas" con este mismo listado.
- [ ] **2. Backend — endpoint.** `apps/api/src/routes/caseSummary.ts`
  (`GET /cases/summary`), registrado en `apps/api/src/routes/index.ts`.
- [ ] **3. Backend — tipos.** `CaseSummaryRow` exportado desde el
  archivo de la ruta (o ubicación de tipos compartida), mismo patrón
  que `CaseFull` en el frontend.
- [ ] **4. Frontend — tipos/api.** `CaseSummaryRow` en
  `apps/web/src/types.ts`; `listCaseSummaries()` en
  `apps/web/src/api.ts`.
- [ ] **5. `format.ts`.** Extraer helper `formatBoat()`; usarlo desde
  `formatParties()` y desde el nuevo componente de listado.
- [ ] **6. `CaseList.tsx`.** Componente nuevo: fetch, agrupar por
  evento, pintar filas, botón "New case" (abre el popup de
  `SPEC-002-nuevo-caso.md`, sin formulario propio en este componente),
  click en fila → mismo callback `onSelect`.
- [ ] **7. `App.tsx`.** Sustituir `CaseSelector` por `CaseList`; guard
  admin-only en Upload examples/rules; botón de usuario + dropdown en
  vez del texto+botón plano actual.
- [ ] **8. Borrar `CaseSelector.tsx`** (queda totalmente sustituido,
  nada más lo importa).
- [ ] **9. Estilos.** CSS del dropdown `.user-menu`; CSS de fila para
  las 4 columnas del listado.
- [ ] **10. Verificar** (ver `SPEC-001-plan.md` → Verificación),
  luego commit + push, avisar para redeploy.

## Fuera de esta tanda de tareas

- Cambiar contraseña desde el submenú de usuario.
- Buscador/filtro/paginación en el listado.
- Cualquier cambio a `CaseForm.tsx` o a la edición de un caso
  individual.

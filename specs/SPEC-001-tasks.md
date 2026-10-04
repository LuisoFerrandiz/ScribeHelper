# SPEC-001 — Tareas

Estado: pendientes, nada implementado todavía.

Relacionado: `SPEC-001-pantalla-de-entrada.md` (requisitos),
`SPEC-001-plan.md` (diseño detallado de cada tarea),
`SPEC-002-nuevo-caso.md` (popup "New case" — su propia tanda de tareas
aparte, no incluida aquí).

Orden de ejecución — cada tarea asume terminadas las anteriores.

- [x] **1. Spec.** Actualizar `SPEC-001-pantalla-de-entrada.md`:
  mover las 4 preguntas resueltas de `[POR DEFINIR]` a "Decisiones
  técnicas"; rellenar "Tareas" con este mismo listado.
- [x] **2. Backend — endpoint.** `apps/api/src/routes/caseSummary.ts`
  (`GET /cases/summary`), registrado en `apps/api/src/routes/index.ts`.
- [x] **3. Backend — tipos.** `CaseSummaryRow` exportado desde el
  archivo de la ruta (o ubicación de tipos compartida), mismo patrón
  que `CaseFull` en el frontend.
- [x] **4. Frontend — tipos/api.** `CaseSummaryRow` en
  `apps/web/src/types.ts`; `listCaseSummaries()` en
  `apps/web/src/api.ts`.
- [x] **5. `format.ts`.** Extraer helper `formatBoat()`; usarlo desde
  `formatParties()` y desde el nuevo componente de listado.
- [x] **6. `CaseList.tsx`.** Componente nuevo: fetch, agrupar por
  evento, pintar filas, botón "New case" (abre el popup de
  `SPEC-002-nuevo-caso.md`, sin formulario propio en este componente),
  click en fila → mismo callback `onSelect`. El botón existe; su
  handler en `App.tsx` es un placeholder hasta que SPEC-002 (fase
  siguiente) lo conecte — intencional, documentado en el código.
- [x] **7. `App.tsx`.** Sustituir `CaseSelector` por `CaseList`; guard
  admin-only en Upload examples/rules; botón de usuario + dropdown en
  vez del texto+botón plano actual.
- [x] **8. Borrar `CaseSelector.tsx`** (queda totalmente sustituido,
  nada más lo importa).
- [x] **9. Estilos.** CSS del dropdown `.user-menu`; CSS de fila para
  las 4 columnas del listado; CSS muerto de `CaseSelector.tsx`
  (`.case-selector`/`.case-browser`) eliminado.
- [x] **10. Verificar.** `npm run typecheck`/`npm run build` limpios;
  probado en vivo en local (listado agrupado, Decided/Pending, click
  abre caso, dropdown con solo Log out, menú admin-only). Revisión con
  el agente `reviewer`: un hallazgo real — `apps/api/src/routes/resources.ts`
  no exigía `requireAdmin` server-side (RF-005, "Seguridad y
  privacidad" de la spec lo pedía verificar explícitamente) — corregido,
  añadido `preHandler: requireAdmin` a las 5 rutas de escritura, mismo
  patrón que `users.ts`. Build limpio tras el fix. Pendiente: commit +
  push, avisar para redeploy (verificación contra el entorno
  desplegado, según "Definición de terminado" de `CLAUDE.md`).

## Fuera de esta tanda de tareas

- Cambiar contraseña desde el submenú de usuario.
- Buscador/filtro/paginación en el listado.
- Cualquier cambio a `CaseForm.tsx` o a la edición de un caso
  individual.

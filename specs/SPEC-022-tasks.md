# SPEC-022 — Tareas

Estado: pendiente, **depende de SPEC-023** (spec v3 tras la segunda revisión del `reviewer`; plan
y tasks actualizados; sin implementar).

Relacionado: `SPEC-022-reglas-aplicables-desde-corpus.md` (requisitos),
`SPEC-022-plan.md` (cómo).

- [x] **0. `reviewer` sobre la spec v2** y ajustes (v3). Hecho.
- [ ] **1. `rules/citation.ts`** — `canonicalNumber`, `prefixFor`,
  `citationFor`/`formatCitation`, `resolveCitation`, `containsNumberToken`.
- [ ] **2. `resources/ruleSections.ts`** — `parseRuleSections` (estilos
  tab y espacio, ruido, partes).
- [ ] **3. Script desechable de prueba** sobre los cuatro `.md` reales
  (secciones por documento, casos de la spec). Debe pasar antes de seguir.
- [ ] **3b. Helper `inTransaction`** síncrono (BEGIN/COMMIT/ROLLBACK).
- [ ] **4. Base de datos** — tablas `rule_section`/`rule_section_fts` en
  `schema.sql`; `ALTER` de `doc_type` y `sections_indexed_at` en
  `migrate.ts`; paso de indexado al arrancar (idempotente, sin fallar si
  falta un `.md`).
- [ ] **5. `resources/sectionIndex.ts`** — `indexResourceSections` y
  `deleteResourceSections` (FTS con `Number(...)`, en transacción).
- [ ] **6. `routes/resources.ts`** — `doc_type` en subida, indexado al
  aceptar, `reclassify` con capa/`event_id`/`doc_type`, borrado de
  secciones en reject/delete, `sectionsPreview` en `GET /resources/:id`.
- [ ] **7. `routes/rules.ts`** — `GET /rules/search` (número exacto + FTS
  saneado, filtro por evento, cita con parte, `cited`).
- [ ] **8. `routes/ruleCitations.ts` + `crud.ts` + `index.ts`** — alta
  validada, `skipCreate`/`skipUpdate`, `position` en servidor.
- [ ] **9. `ai/draft.ts`** — patrón ampliado, `validateCitations` y
  `findExcerpt` sobre `rule_section` y límites de token.
- [ ] **10. Cliente: tipos y `api.ts`**.
- [ ] **11. `ResourceUpload.tsx`** — `doc_type`, reclasificar con capa,
  revisión con "N rules detected".
- [ ] **12. `RulePicker.tsx` dentro de `RulesSuggestions.tsx` (SPEC-023) y
  `CaseForm.tsx`** — buscador por regla con "Add" que registra e inserta; adelgazar `CaseForm`; retirar `searchResources` de `api.ts` si
  queda sin uso.
- [ ] **13. `DECISIONS.md`** — D-034 (append-only).
- [ ] **14. Verificar en local.** `npm run build` (api), `npm run
  typecheck` (web), script de la tarea 3 y prueba manual con API local.
- [ ] **15. Commit y push a `master` (solo cuando el dueño lo ordene).
  Antes del redeploy el dueño copia `data/db`. Redeploy en Portainer,
  reclasificar NoR y SI de París a `event` con su `doc_type`, y
  verificación en vivo según la spec.**

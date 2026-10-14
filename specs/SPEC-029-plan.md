# SPEC-029 — Plan

Relacionado: `SPEC-029-aviso-desfase-cajas.md`.

API: `db/migrate.ts` (4 columnas `*_at`, ALTER idempotente); `routes/crud.ts`
(opción `stampOnChange`, lectura previa y 404 antes del UPDATE); `routes/index.ts`
(solo `cases` la pasa); `routes/caseDetail.ts` (`POST /cases/:id/box-reviewed`,
lista blanca).

Web: `staleBoxes.ts` (función pura), `components/StaleNote.tsx`, prop `notes`
en `CopyBox`/`WritingBox`, `types.ts` (marcas en `CaseRow`), `api.ts`
(`markBoxReviewed`), `CaseForm.tsx` (copia las marcas de la respuesta del PUT
justo después de `updateCase`; `handleReviewed`).

Verificación: script `check_stale.ts` (función pura), API local sobre copia de
datos con curl (marcas al cambiar, sin cambio, vaciar, ruta, 400/404, `_at` no
escribible), en vivo tras el redeploy.

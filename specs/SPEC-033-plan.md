# SPEC-033 — Plan

Spec: `SPEC-033-documentos-permanentes-y-de-evento.md` (v2). Un cambio de BD:
tabla `app_meta` (aditiva) y una migración de datos (filas `class`). **Antes del
redeploy, recordar copia de `data/db`.**

## Piezas y archivos

| Pieza | Archivo | Cambio |
|---|---|---|
| Tipos y prefijo | `apps/api/src/rules/citation.ts`, `apps/api/src/resources/storage.ts` | `DocType` a 6 valores; `prefixFor` con `class`/`*_amendment` y capa heredada `class` |
| Validación | `apps/api/src/routes/resources.ts` | capas `rrs`/`event` (400 si no), `reclassify` exige `layer`, lista de `doc_type` nueva, mensajes |
| Elegibilidad | `apps/api/src/rules/sectionQuery.ts` | comentario y excepción de la capa heredada `class` |
| Parser | `apps/api/src/resources/ruleSections.ts` | estilo `letra.número`, elección estricta, filtro de índices, versión del parser exportada |
| Reindexado | `apps/api/db/schema.sql`, `apps/api/src/db/migrate.ts`, `apps/api/src/resources/sectionIndex.ts` | tabla `app_meta`, `rule_index_version`, poner `sections_indexed_at=NULL` si la versión es menor |
| Migración | `apps/api/src/db/migrate.ts` (función en `resources/`) | filas `class` → `event` + `class`, robusta, antes de indexar |
| Referencias | `apps/api/src/rules/factsQuery.ts`, `apps/api/src/ai/complete.ts` | `C.1.1` / `A.1` |
| Web: tipos | `apps/web/src/types.ts` | `DocType` 6 valores |
| Web: pantalla | `apps/web/src/components/ResourceUpload.tsx` (+ CSS) | selector de 2 grupos, tipo + casilla "Amendment", cuadros "Permanent"/"Event", pendientes con capa/tipo |
| Docs | `DECISIONS.md` D-045, notas en SPEC-019/022, `issue.md` | al final |

## Orden

1. Servidor: tipos, `prefixFor`, validación de rutas.
2. Parser nuevo + script de no regresión (RRS, NoR, SI) + recuento SB20.
3. `app_meta`, reindexado por versión, migración de filas `class`.
4. Referencias tecleadas (`EXPLICIT_REF`, `RULE_REF`).
5. Web: tipos y pantalla.
6. Build/typecheck, scripts de prueba, probar la migración sobre copia de la BD.
7. Preguntar commit; el dueño hace copia de `data/db`, redeploy, "Commit: <hash>".
8. Verificación en vivo (criterios 4-9), limpieza de lo subido para pruebas.
9. Docs (D-045, issue.md, memoria).

## Riesgos de la construcción

- **Parser:** la comparación vieja/nueva debe cubrir RRS, NoR y SI reales antes
  de tocar producción; el estilo nuevo solo gana con cuenta estrictamente mayor.
- **Migración en arranque:** nunca debe tumbar el contenedor (try/catch, saltos
  con aviso). Probar con 0, 1 y varias regatas sobre una copia de la BD de
  prueba (`devdata`), nunca sobre `data/db`.
- **Reindexado global:** cambia los ids de sección; comprobar que nada los
  guarda (citas guardan texto).
- Verificación de la subida de reglas y de la migración en producción requiere
  copia previa de `data/db`.

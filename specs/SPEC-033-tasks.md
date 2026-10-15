# SPEC-033 — Tareas

- [ ] T1 `citation.ts`/`storage.ts`: `DocType` a 6 valores, `prefixFor` (`class`, `*_amendment`, capa heredada `class` → `CR`).
- [ ] T2 `routes/resources.ts`: solo `rrs`/`event` (400 si no), `reclassify` exige `layer`, lista de `doc_type` y mensajes (dos sitios).
- [ ] T3 `sectionQuery.ts`: documentar la excepción de la capa heredada `class` en `ELIGIBLE_SQL`.
- [ ] T4 `ruleSections.ts`: estilo `letra.número`, elección estricta (`>` de las otras dos), filtro de índices con puntos guía solo en ese estilo, exportar `RULE_PARSER_VERSION = 2`.
- [ ] T5 Script desechable: parser viejo vs nuevo sobre `data/rules/**/*.md` (RRS Parts, RRS appendix, NoR y SI de París) → listas idénticas; sobre el Markdown de la SB20 (de `data/rules/class/`) → recuento exacto y secciones mínimas (`A1`, `A1.1`, `C1`, `C1.1`). Anotar el recuento en la spec.
- [ ] T6 `schema.sql`: tabla `app_meta`. `migrate.ts`/`sectionIndex.ts`: `rule_index_version`; si es menor que `RULE_PARSER_VERSION`, `sections_indexed_at=NULL` en las reglas aceptadas y guardar la versión tras reindexar.
- [ ] T7 Función `migrateClassRules` (en `resources/`) y llamada en `migrate.ts` antes de `indexPendingSections`: regata destino (única o `TEST`), mover `.md` si procede, un `UPDATE`, logs, `try/catch` sin tumbar el arranque.
- [ ] T8 `factsQuery.ts` `EXPLICIT_REF` y `ai/complete.ts` `RULE_REF`: aceptar `C.1.1` / `A.1`.
- [ ] T9 `web/types.ts`: `DocType` 6 valores; `ResourceUpload.tsx`: selector de 2 grupos, tipo + casilla "Amendment", etiquetas legibles (`DOC_TYPE_LABEL`), cuadros "Permanent"/"Event", nota de otras regatas, filas heredadas `class`, "Pending review" con capa y tipo, reclasificar con el mismo selector.
- [ ] T10 Scripts: `prefixFor`, `parseCitation`/`EXPLICIT_REF`, composición de `doc_type`; probar la migración sobre copia de la BD de prueba con 0, 1 y varias regatas, y una segunda ejecución.
- [ ] T11 `npm run build` (api) y `npm run typecheck` (web); comprobar en local el parser con la BD de prueba (reindexado y cita `CR C1.1`).
- [ ] T12 Preguntar commit. Recordar al dueño la copia de `data/db` antes del redeploy.
- [ ] T13 Tras "Commit: <hash>": verificación en vivo (criterios 4-9); borrar lo subido para pruebas.
- [ ] T14 Docs: D-045, notas en SPEC-019/022, `issue.md`, memoria de traspaso. `CLAUDE.md`/`constitution.md` solo si el dueño lo ordena.

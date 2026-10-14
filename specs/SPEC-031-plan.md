# SPEC-031 — Plan

Relacionado: `SPEC-031-rellenar-huecos-ia.md`.

API: `ai/fillGaps.ts` (`isDataGapText`, `readGaps`, `buildSources`,
`validateFills`, `fillGaps`: Sonnet, JSON, validación determinista);
`routes/fillGaps.ts` (`POST /cases/:id/fill-gaps`, registrada en `routes/index.ts`).

Web: `gapFill.ts` (`dataGaps`, `replaceGapAt`, `replaceGapsAt`),
`components/GapFillPanel.tsx`, mango `replaceValue` en `GhostTextarea`, prop
`below` en `WritingBox`, `CaseForm` (panel en las 4 cajas), `types.ts`
(`GapFill`), `api.ts` (`fillGaps`), `styles.css`.

Verificación: `check_fill.ts` (servidor: validación, 17 casos),
`check_gapfill.ts` (cliente: alternativas, duplicados, contexto, `\r\n`,
acuerdo cliente/servidor), build api y web; en vivo con el modelo (la clave
solo está en el servidor).

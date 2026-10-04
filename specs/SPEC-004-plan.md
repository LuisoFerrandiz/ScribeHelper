# SPEC-004 — Plan

Estado: nada que implementar — spec puramente descriptiva de código ya
desplegado.

Relacionado: `SPEC-004-general-parties.md` (requisitos/comportamiento
documentado), `SPEC-004-tasks.md` (desglose en tareas).

## Por qué no hay diseño de implementación

Igual que SPEC-003: toda la funcionalidad descrita ya existe y está
desplegada en `apps/web/src/components/CaseForm.tsx` (tab "1. General
& Parties") — metadatos del caso, Parties, Witnesses, sugerencias
desde la extracción de SPEC-003, botón Save único. El trabajo de esta
spec fue escribir `SPEC-004-general-parties.md` a partir del código
existente, corrigiendo dos suposiciones erróneas del pedido original
(witnesses con campos de barco; lectura directa del `.md` en vez de
sugerencia vía extracción).

## Verificación de la documentación

Comprobado leyendo código, no hay comportamiento nuevo que probar en
vivo:

- Campos del formulario de metadatos vs `CaseForm.tsx:542-594`.
- Parties (sail number/boat name/represented by, datalist) vs
  `CaseForm.tsx:608-640`.
- Witnesses (`WitnessDraft` = `id`/`fullName`/`role`, sin campos de
  barco) vs `CaseForm.tsx:40-44, 642-678`.
- Conexión sugerencia→UI vs `useSuggestedParty` (370-379) y
  `addSuggestedWitness` (381-383).
- Guardado único vs `handleSaveGeneral` (persiste metadatos + parties
  + witnesses + las cuatro cajas libres juntas).

## Decisiones confirmadas, no abiertas

A diferencia de SPEC-001/002, no hay `[POR DEFINIR]` — las dos
ambigüedades del pedido original ya se resolvieron en chat antes de
escribir la spec:

- Witnesses se quedan sin sail number/boat/represented by.
- Las sugerencias siguen siendo manuales (click-to-insert), no se
  cambia a auto-rellenado.

# SPEC-030 — Plan

Relacionado: `SPEC-030-fantasma-con-cadena.md`.

API: `ai/complete.ts` (`chainContextFor`, tabla de qué ve cada caja, prompt de
contexto, mensaje con etiquetas); `routes/complete.ts` (pasa `context`).

Web: `types.ts` (`ChainContext`), `api.ts` (`completeInline` con `context`),
`GhostTextarea` (prop `chain`, `chainRef` asignada en cada render y leída al
disparar), `CaseForm` (pasa las cajas anteriores en Rules, Conclusion y
Decision).

Verificación: script `check_chain.ts` (función pura: tabla, validación,
recorte, marcas, dígitos), build api/web, y en vivo tras el redeploy con
llamadas reales al modelo (la clave solo está en el servidor): coherencia en
Conclusion/Decision, sin dígitos en Rules, intento de inyección en hechos.

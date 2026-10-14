# SPEC-021 — Rules Applicable en su propia pestaña

Estado: **implementada, desplegada y verificada en vivo (2026-10-14)** en
`c3e6c1b`: barra 0 a 8, Conclusion sola, Add y Remove de una cita en la
pestaña nueva. Sin probar en vivo: Copy, Review y Download. Spec corta, sin
revisión del subagente `reviewer` (cambio de ubicación); pedida por el dueño
(2026-10-13). **Parcialmente superada por SPEC-023:** sus RF-003 y RF-004
("contenido sin cambios", "Review no cambia") ya no valen; la pestaña ahora
tiene cuadro de texto propio y Review incluye Rules Applicable.

Relacionado: encaja con la cadena Facts Found → Rules Applicable →
Conclusion → Decision del replanteo (`issue.md`); prepara F1 (añadir
reglas desde el corpus) y F5 (reglas sugeridas desde los hechos).
`apps/web/src/components/CaseForm.tsx`, `apps/web/src/styles.css`.

## Intención

Hoy Conclusion y Rules Applicable comparten pestaña ("5. Conclusion"),
en dos columnas. El dueño quiere Rules Applicable en una **pestaña
propia entre Conclusion y Decision**, y fuera de la de Conclusion.

## Requisitos funcionales

- **RF-001 — Pestaña nueva.** "6. Rules Applicable", entre "5.
  Conclusion" y "7. Decision". "Review" pasa a "8. Review".
- **RF-002 — Conclusion sola.** La pestaña Conclusion muestra solo la
  caja Conclusion (con su `GhostTextarea` y lista de sugerencias), a
  ancho completo, sin Rules Applicable.
- **RF-003 — Contenido sin cambios.** La pestaña Rules Applicable
  contiene exactamente lo de hoy: lista de citas con "Remove",
  formulario "Add", buscador del corpus y botón "Copy" de la caja. No
  cambia ninguna lógica de citas (eso es F1).
- **RF-004 — Sin efectos colaterales.** Copy, "Download decision (.html)",
  orden del documento completo y la pestaña Review no cambian. El
  procesado automático de hearing notes al cambiar de pestaña sigue
  limitado a Procedural Matters, Facts Found, Conclusion y Decision.
- **RF-005 — CSS.** Se elimina `.two-col`, que queda sin uso.

## Fuera de alcance

Añadir reglas desde los resultados del corpus (F1), reglas sugeridas
desde los hechos (F5), cambios de formato de cita.

## Coherencia

D-029 regla 1 (un modo de presentación por pestaña): la pestaña mezcla
una caja de documento con controles de entrada, igual que antes en
Conclusion; no empeora y se revisará con F1.

## Verificación

1. `npm run typecheck` en `apps/web` limpio.
2. En vivo: la barra muestra 0..8 con Rules Applicable entre Conclusion y
   Decision; Conclusion sin reglas; añadir y quitar una regla y Copy
   funcionan en la pestaña nueva; Review y Download sin cambios.

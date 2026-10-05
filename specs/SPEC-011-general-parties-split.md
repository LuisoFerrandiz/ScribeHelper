# SPEC-011 — Separar General y Parties & Witness, Save por pestaña

Estado: draft.

Relacionado: `DECISIONS.md` D-029 (la regla que motiva esta spec:
coherencia interna dentro de una pestaña — regla 1, presentación
uniforme), D-028 (separación UX/lógica), `SPEC-004-general-parties.md`
(documenta "1. General & Parties" como ya construido — el fichero no
se edita, pero esta spec lo deja parcialmente desactualizado: esa
pestaña deja de existir como tal, se reemplaza por dos pestañas
nuevas, mismo criterio que D-021 ya aplicó para otros casos),
`SPEC-009-plan.md` (precedente directo: `reloadJury()`, la misma
técnica de "refresco acotado, nunca el `reload()` genérico" que esta
spec reutiliza y extiende), `SPEC-010-general.md` (la sección
"General" tal como quedó — esta spec le da su propia pestaña, sin
tocar su contenido).

## Intención

D-029 regla 1 señala "1. General & Parties" como la pestaña que mezcla
modos de presentación: "General" es formulario puro (inputs sueltos,
sin `CopyBox`) mientras "Parties & Witness" vive dentro de un `CopyBox`
(tratamiento de caja documental, con botón Copy). Se separan en dos
pestañas — "1. General" y "2. Parties & Witness" — cada una
internamente consistente (confirmado en "Decisiones técnicas": ninguna
de las dos mezcla modos *dentro de sí misma*, el problema era tenerlas
juntas en una sola pestaña).

Separar las pestañas obliga a resolver cómo se guarda cada una: hoy un
único botón Save (en la pestaña vieja "General & Parties") persiste
TODO junto — case meta, parties, witnesses y las 4 cajas de texto
libre (Procedural Matters/Facts Found/Conclusion/Decision), que ni
siquiera viven en esa pestaña. El dueño decidió explícitamente
(conversación 2026-10-05) que cada pestaña debe guardar exactamente lo
suyo, con su propio botón — esto se extiende más allá de
General/Parties a las 4 cajas de texto libre y a Review, no solo a las
dos pestañas que motivaron el cambio.

## Alcance

**Dentro:**
- "1. General" (Case number, Day, Race, With case(s), botón Save) —
  mismo contenido que la "General" de SPEC-010, ahora en su propia
  pestaña, sin `CopyBox`. Su Save guarda solo case_number/day/race (+
  `informed_at`, que sigue sin input, viaja igual en el payload sin
  cambio de comportamiento).
- "2. Parties & Witness" (pestaña nueva) — el `CopyBox` ya existente,
  contenido sin cambios, con un botón "Save" nuevo en su cabecera
  (junto a "Copy"). Su Save guarda solo parties + witnesses.
- Renumeración del resto: Procedural Matters pasa a "3.", Facts Found
  a "4.", Conclusion a "5.", Decision a "6.", Review a "7.".
- Cada una de las 4 pestañas de texto libre gana su propio botón Save
  (en la cabecera de su `CopyBox`, junto a "Copy"), que guarda
  únicamente esa caja.
- "7. Review" gana su propio botón Save, que guarda las 4 cajas de
  texto juntas en un solo PATCH (es "toda la información de esa
  pestaña" — ver "Decisiones técnicas").
- `CopyBox.tsx` gana una prop opcional `onSave`/`saving` para alojar
  este botón sin duplicar su maquinaria en cada caja.
- `saving` pasa de `boolean` a `Record<string, boolean>` — un guardado
  en curso en una pestaña nunca deshabilita ni muestra "Saving…" en
  otra.
- Ningún guardado nuevo dispara el `reload()` genérico (que reseedaría
  los 4 `useState` de texto libre desde el servidor, pisando cualquier
  cambio sin guardar en otra pestaña — el mismo riesgo que
  `reloadJury()` ya resolvió para el jurado en SPEC-009). Los
  guardados de texto libre y de "General" no necesitan ningún
  refresco (el estado local ya es la fuente de verdad para todo lo que
  se renderiza); "Parties & Witness" usa un refresco acotado nuevo,
  `refreshParties()`, que solo toca `parties`/`witnesses` y lo
  derivado de ellos.

**Fuera de esta spec:**
- `Rules Applicable` (dentro de "5. Conclusion") — sigue sin Save
  propio, Add/Remove siguen actuando al instante, sin cambios (nunca
  formó parte del guardado batcheado).
- `With case(s)` (dentro de "1. General") — sigue actuando al instante
  vía `handleLinkCase`/`handleRemoveLink`, fuera de cualquier Save.
- **Hallazgo colateral, no corregido aquí**: `handleLinkCase`,
  `handleRemoveLink`, `handleUploadAttachment`,
  `handleRemoveAttachment`, `handleAddRule` y `handleRemoveRule` ya
  llaman hoy al `reload()` genérico (antes de esta spec), que reseedea
  los 4 `useState` de texto libre desde el servidor cada vez que se
  disparan — sea cual sea la pestaña activa. Es el mismo bug de raíz
  que `reloadJury()` resolvió para el jurado, sin resolver aquí. Esta
  spec no lo agrava técnicamente, pero lo hace más probable de activar
  (antes había un único Save global, ahora es normal tener texto sin
  guardar en una pestaña mientras se actúa en otra). Candidato a una
  spec de seguimiento: generalizar `reloadJury`/`refreshParties` a
  `reloadAttachments`/`reloadLinkedCases`/`reloadRuleCitations`, cada
  uno acotado a su porción de `caseFull`.
- Tocar `SPEC-004-general-parties.md` — spec cerrada, no se edita.

## Requisitos funcionales

- **RF-001 — Pestaña "1. General".** Formulario puro (Case number,
  Day, Race, With case(s), Save), sin `CopyBox`, contenido idéntico a
  la "General" actual de SPEC-010.
- **RF-002 — Pestaña "2. Parties & Witness".** El `CopyBox` existente,
  sin cambios de contenido, con botón "Save" nuevo en su cabecera.
- **RF-003 — Renumeración.** Procedural Matters/Facts
  Found/Conclusion/Decision/Review pasan a "3."/"4."/"5."/"6."/"7.".
- **RF-004 — Save por pestaña, solo su propia información.** Cada una
  de las 7 pestañas con contenido editable (General, Parties &
  Witness, Procedural Matters, Facts Found, Conclusion, Decision,
  Review) tiene su propio botón Save que persiste únicamente lo que
  esa pestaña muestra — ningún Save toca datos de otra pestaña.
- **RF-005 — Ningún guardado pisa ediciones sin guardar de otra
  pestaña.** Escribir sin guardar en una pestaña, guardar otra, volver
  a la primera → el texto sin guardar sigue intacto (verificación en
  vivo obligatoria antes de cerrar, mismo criterio que SPEC-009
  RF-007).
- **RF-006 — Indicador de guardado independiente por pestaña.** Un
  guardado en curso en una pestaña no deshabilita ni muestra
  "Saving…" en el botón de otra.
- **RF-007 — Review guarda las 4 cajas juntas.** El Save de "7.
  Review" persiste procedural_matters/facts_found/conclusion/decision
  en un único PATCH.

## Decisiones técnicas

- Separar en dos pestañas basta para cumplir D-029 regla 1 — ninguna
  de las dos mezcla modos de presentación dentro de sí misma: "General"
  es 100% formulario sin `CopyBox`; "Parties & Witness" es 100% inputs
  de formulario, el `CopyBox` que los envuelve es solo el contenedor
  documental que ya necesita (es una de las 8 cajas fijas del
  documento, D-004/CLAUDE.md, con su propio Copy) — no convierte sus
  campos en texto libre ni introduce una mezcla. No hace falta (ni se
  recomienda) sacar Parties & Witness de `CopyBox`.
- `CopyBox` gana `onSave?`/`saving?` opcionales en vez de crear un
  componente nuevo — evita duplicar la maquinaria de cabecera
  (collapse, badge "Copied") en 5 sitios; las cajas que no pasan la
  prop (Rules Applicable) no cambian en nada.
- Un helper `saveField(key, patch)` interno a `CaseForm.tsx` evita
  repetir el mismo try/catch 5 veces (D-028: lógica común en un
  helper, no duplicada por handler) — se queda en el componente, no en
  `format.ts`, porque es orquestación de guardado de UI, mismo
  patrón que `savePartyRole` ya existente ahí.
- `refreshParties()` es el único refresco necesario tras un guardado
  nuevo — testigos recién creados obtienen un `id` del servidor que el
  draft local no tiene; `findOrCreateBoat`/`findOrCreatePerson` ya
  mantienen `boats`/`people` al día por su cuenta. Ningún otro
  guardado necesita refresco: el estado local de
  `caseNumber`/`day`/`race`/`informedAt`/los 4 textos ya es la fuente
  de verdad que `liveCase` usa para todo lo que se renderiza y
  exporta.
- Review gana Save propio (no remite a las 4 pestañas individuales)
  porque, tras esta spec, "cada pestaña guarda su propia información"
  es la regla — sin Save, Review sería una trampa donde editar no
  persiste nada por sí solo. Las 4 cajas comparten el mismo `useState`
  entre Review y sus pestañas individuales, así que guardar desde
  cualquiera de los 5 sitios persiste siempre el mismo valor vigente
  en pantalla — nunca hay conflicto entre dos valores distintos.

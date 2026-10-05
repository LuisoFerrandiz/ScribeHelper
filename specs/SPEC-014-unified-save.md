# SPEC-014 — Un único Save, junto a Download decision

Estado: draft.

Relacionado: `SPEC-011-general-parties-split.md`/`SPEC-011-plan.md`
(spec cerrada que introdujo un botón Save por pestaña — General,
Parties & Witness, Procedural Matters, Facts Found, Conclusion,
Decision, Review — cada uno guardando solo su propia data; SPEC-014 no
la edita, pero sustituye ese comportamiento: los 7 botones
desaparecen, su lógica de guardado se consolida en un único botón
nuevo), `DECISIONS.md` D-029 (no se contradice: la regla de coherencia
interna es sobre el modo de presentación de cada pestaña — formulario
vs. documento — y sobre uniformidad de fuentes de sugerencia; no dice
nada sobre dónde vive el botón Save ni sobre si hay uno o varios),
`CLAUDE.md` (El documento de decisión — Case number/Day/With case(s)/
Race/iniciador/respondido/testigos/jurado son "datos auto-rellenados",
Procedural Matters/Facts Found/Conclusion/Decision son las 4 "cajas
escritas por el humano").

## Intención

SPEC-011 decidió, a petición explícita del dueño en su momento, que
cada pestaña con contenido editable tuviera su propio botón Save,
guardando solo los datos de esa pestaña. El dueño pide ahora lo
contrario: un único botón Save, visible siempre (junto a "Download
decision (.html)", fuera de cualquier pestaña — mismo sitio, mismo
patrón ya usado para ese botón), que guarda **todos** los datos
editables del caso de una vez, sin importar qué pestaña esté activa.

## Alcance

**Dentro:**
- Un botón nuevo "Save" en `.tab-bar-row`, junto a "Download decision
  (.html)" (mismo nivel visual, siempre visible, no depende de
  `caseTab`).
- `handleSaveAll()` — un único handler que guarda, en una sola
  operación lógica:
  - General: `case_number`/`day`/`race`/`informed_at`.
  - Parties & Witness: initiator/respondent (vía `savePartyRole`,
    sin cambios en su lógica interna) + reconciliación de testigos
    (crear/borrar, misma lógica que ya tenía `handleSaveParties`).
  - Las 4 cajas de texto libre: `procedural_matters`/`facts_found`/
    `conclusion`/`decision`, en el mismo `PATCH` que General (mismo
    patrón que ya usaba `handleSaveReview`, extendido a incluir
    también General y Parties).
  - Al terminar, refresca `caseFull.parties`/`caseFull.witnesses` vía
    `refreshParties()` (igual que ya hacía `handleSaveParties`) —
    necesario porque testigos nuevos obtienen un id real del
    servidor.
- Se eliminan los 7 botones Save por pestaña: el de la sección
  "General" (y su `<form onSubmit>`, que pasa a ser un contenedor
  normal sin submit propio), el de la cabecera del `CopyBox` de
  "Parties & Witness", el de cada uno de los 4 `CopyBox` de texto
  libre, y el de la cabecera de "Review".
- `CopyBox.tsx` pierde los props `onSave`/`saving` — tras este cambio
  ningún llamador los pasa (confirmado al implementar: si alguno
  quedara, no se borran los props). Vuelve a su forma de antes de
  SPEC-011 (solo botón Copy en la cabecera).
- El estado `saving: Record<string, boolean>` se sustituye por un
  único `savingAll: boolean`.

**Fuera de esta spec:**
- Rules Applicable y With case(s) — siguen actuando al instante, sin
  Save propio, sin cambios (nunca tuvieron botón Save, ni en SPEC-011
  ni aquí).
- Adjuntos (pestaña "0") y jurado (pestaña "7", `JurySlots`) — siguen
  actuando al instante, sin Save propio, sin cambios.
- SPEC-013 (refrescos acotados para With case(s)/adjuntos/reglas) —
  independiente, sin solapamiento: toca otros 6 handlers, no los que
  esta spec consolida.
- Cualquier cambio al formato del `.html` exportado (`handleDownload`
  sigue leyendo `liveCase`, que sigue overlayando el estado local sobre
  `caseFull` exactamente igual que hoy).

## Requisitos funcionales

- **RF-001 — Un único botón, siempre visible.** El botón "Save"
  aparece junto a "Download decision (.html)", visible sin importar
  qué pestaña esté activa.
- **RF-002 — Guarda todo de una vez.** Pulsar Save persiste, en la
  misma acción: General (4 campos), Parties & Witness (initiator,
  respondent, testigos añadidos/eliminados), y las 4 cajas de texto
  libre — todo junto, sin que haga falta visitar cada pestaña.
- **RF-003 — Ningún botón Save por pestaña.** Ninguna de las 7
  pestañas que antes tenía su propio Save lo conserva.
- **RF-004 — Estado de guardado visible.** Mientras `handleSaveAll`
  está en curso, el botón muestra "Saving…" y queda deshabilitado,
  igual que hacían los botones por pestaña antes.
- **RF-005 — Sin pérdida de datos entre pestañas.** Puesto que ya no
  hay guardado parcial por pestaña, este riesgo (el que motivó
  `reloadJury`/`refreshParties`/SPEC-013) deja de aplicar aquí: el
  único refresco que ocurre tras guardar (`refreshParties`) sigue sin
  tocar las 4 cajas de texto ni los campos de General, por la misma
  razón de siempre — nunca pisar lo que el usuario acaba de guardar él
  mismo con un valor obsoleto si la llamada de red tarda.
- **RF-006 — Sin regresión en Rules Applicable/With case(s)/adjuntos/
  jurado.** Siguen actuando al instante, exactamente igual que antes
  de esta spec.

## Decisiones técnicas

- Un único `PATCH /cases/:id` para General + las 4 cajas de texto
  (mismo endpoint que ya usaba cada guardado por separado, ahora con
  más campos en el mismo cuerpo) + las llamadas ya existentes de
  `savePartyRole`/testigos para Parties & Witness — no se crea ningún
  endpoint de backend nuevo, se reutiliza `api.updateCase` y las
  mismas funciones que SPEC-011 ya tenía para Parties.
- `CopyBox.tsx` vuelve a su forma pre-SPEC-011 en vez de dejar los
  props `onSave`/`saving` sin uso — ningún código muerto.
- El botón se coloca junto a Download decision por ser ya el sitio
  donde vive una acción "para todo el caso, no para una pestaña" —
  mismo criterio de agrupación, no una posición arbitraria nueva.

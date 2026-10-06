# SPEC-016 — Tareas

Estado: implementado, verificado en localhost, reviewer APROBADO
(spec/plan tras 3 fixes y, por separado, implementación RF por RF —
input Informed-at confirmado fuera del CopyBox, `updateParty`
confirmado sin ningún llamador en todo el repo, reconciliación
add/remove de parties confirmada sin duplicar ni perder filas, sin
restos del modelo singular en ningún consumidor, `npm run build`/
`npm run typecheck` limpios). Pendiente: commit + push (push solo
cuando el usuario lo pida), redeploy en Portainer (la migración se
aplica sola al arrancar el contenedor), y reconfirmación en vivo
contra `http://192.168.1.105:8086/`.

Relacionado: `SPEC-016-ux-form-tweaks.md` (requisitos),
`SPEC-016-plan.md` (diseño).

Orden de ejecución — backend primero (la migración debe existir antes
de que el frontend intente leer/escribir el campo nuevo).

- [x] **1. `schema.sql` — columna `with_case_note` en `protest_case`.**
- [x] **2. `migrate.ts` — `ALTER TABLE` guardado por
  `PRAGMA table_info`.** Idempotencia verificada: corrido dos veces
  contra una copia de la BD real, la columna se añade una sola vez,
  segunda corrida no falla ni repite el mensaje de migración.
- [x] **3. `index.ts` — `with_case_note` en los campos de
  `registerCrud(app, 'cases', ...)`.**
- [x] **4. `caseSummary.ts` — `byRole` devuelve array, `CaseSummaryRow`
  gana `initiators`/`respondents` (plural).**
- [x] **5. `types.ts` — `CaseRow.with_case_note`,
  `CaseSummaryRow.initiators`/`respondents`.**
- [x] **6. `api.ts` — `deleteParty`; borrado `updateParty` (sin
  llamador tras este cambio — sin edición in situ).**
- [x] **7. `PartyReference.tsx` — props `initiators`/`respondents`
  (arrays), una fila por party.**
- [x] **8. `SuggestionsPanel.tsx` — `PartyReferenceData` con arrays.**
- [x] **9. `format.ts` — `formatParties`/`formatAutoProceduralLines`
  iteran por party, no por rol; `formatFullDecisionHtml` tabla de
  Parties + línea With Case(s) con la nota.**
- [x] **10. `CaseList.tsx` — columnas Initiator/Respondent unen varias
  entradas con coma.**
- [x] **11. `CaseForm.tsx` — `PartyDraft`, `partyDrafts`/`partyForm`,
  `handleStageParty`/`handleUnstageParty`/`addSuggestedParty`,
  reconciliación en `handleSaveAll`, `withCaseNote` state +
  PATCH.** Sustituye `savePartyRole`/`useSuggestedParty`
  por completo.
- [x] **12. `CaseForm.tsx` — JSX "1. General" en filas apiladas.**
- [x] **13. `CaseForm.tsx` — JSX "2. Parties & Witness", Parties en
  lista+add-form por rol (mismo patrón que Witness).**
- [x] **14. `CaseForm.tsx` — JSX "6. Decision" gana input Informed
  at, fuera del `CopyBox` (D-029 regla 1 — sección de formulario
  propia, mismo criterio que "General").**
- [x] **15. `CaseForm.tsx` — JSX "7. Review" gana el mismo campo.**
- [x] **16. `styles.css` — `.general-fields-col` nueva;
  `.general-fields-row` y sus hijas, borradas (quedan sin uso).**
- [x] **17. Verificar.** `npm run build` (api) / `npm run typecheck`
  (web) limpios. Probado en vivo contra localhost (caso de prueba
  desechable `T1`/`T2`, evento `SPEC016 Test Event`):
  - **RF-101**: confirmado por JS que `.general-fields-col` tiene 5
    `.party-row` apiladas (Case number/Day/Race/With case(s)/With
    case(s) notes).
  - **RF-201/RF-202**: nota libre + caso vinculado coexisten en BD
    (`with_case_note` guardado, `case_link` en ambas direcciones);
    export `.html` muestra "With Case(s): T2 — Also see Case 99 from
    last regatta".
  - **RF-301 a RF-305**: 2 initiators + 2 respondents añadidos vía
    UI, guardados con el único Save; confirmado en BD (4 filas
    `party`, ids reales); `PartyReference` en Facts Found muestra los
    4; listado de casos muestra "ITA1 Boat A, ITA2 Boat B" / "USA1
    Boat C, USA2 Boat D" (unidos por coma); export `.html` lista las
    4 filas en la tabla de Parties.
  - **RF-401/RF-402/RF-403**: input "Informed at" confirmado
    estructuralmente fuera del `CopyBox` de Decision (aparece antes
    de la cabecera colapsable "▾Decision"); mismo valor reflejado sin
    guardar en Review; guardado confirmado en BD
    (`informed_at = '2026-10-06 18:30'`); línea del export sin
    regresión.
  - Migración aplicada también contra la BD de desarrollo real
    (`data/db/scribe_helper.sqlite`), no solo la copia de prueba.
  - Datos de prueba limpiados (evento de prueba borrado — cascada
    también casos/parties/case_link —, personas de prueba y usuario
    `spec016tmp` borrados); dev servers detenidos.
  - Pendiente: validación del agente `reviewer` sobre la
    implementación, y verificación en vivo contra
    `http://192.168.1.105:8086/` (entorno desplegado, tras "Pull and
    redeploy" — la migración se aplicará sola al arrancar el
    contenedor) antes de cerrar.

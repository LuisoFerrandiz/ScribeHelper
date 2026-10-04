# SPEC-008 — Plan

Relacionado: `SPEC-008-decision.md` (requisitos).

## RF-001 — Lista de referencia con prueba(s)

`apps/web/src/components/PartyReference.tsx` — añadir prop opcional
`race?: string` y una tercera fila, solo si `race` tiene valor:

```tsx
interface Props {
  initiator: Party;
  respondent: Party;
  race?: string;
  currentText: string;
}

const matchesRace = !!race && currentText.includes(race);
```

```tsx
{race && (
  <div className={matchesRace ? 'party-reference-row highlight' : 'party-reference-row'}>
    <strong>Race:</strong> {race}
  </div>
)}
```

No se renombra el componente ni el archivo — sigue siendo la misma
"lista de referencia", ahora usada también en Decision, no solo en
Facts Found.

`apps/web/src/components/SuggestionsPanel.tsx` — `PartyReferenceData`:
añadir `race?: string`; pasar `race={partyReference.race}` a
`<PartyReference />`.

`apps/web/src/components/CaseForm.tsx` — en el bloque
`caseTab === 'decision'`, pasar a `SuggestionsPanel`:

```tsx
partyReference={{
  initiator: { sailNumber: initiator.sailNumber, boatName: initiator.boatName },
  respondent: { sailNumber: respondent.sailNumber, boatName: respondent.boatName },
  race,
}}
```

(`race` ya es un `useState` existente del componente, `CaseForm.tsx:70`
— no se lee de ningún sitio nuevo.)

## RF-002 — Phrases

Sin cambios.

## RF-003 — AI suggestions desde examples

Mismo patrón mecánico que SPEC-007 RF-003, una caja más:

1. `apps/api/src/ai/exampleSuggestions.ts`:
   - `ExampleSuggestionBox`: añadir `'decision'`.
   - `BOX_SECTION_HINT`: añadir `decision: 'Decision'`.
2. `apps/api/src/routes/exampleSuggestions.ts`:
   - `VALID_BOXES`: añadir `'decision'`.
3. `apps/web/src/types.ts`:
   - `ExampleSuggestionBox`: añadir `'decision'`.
4. `apps/web/src/components/SuggestionsPanel.tsx`:
   - `EXAMPLE_SUGGESTION_BOXES`: añadir `'decision'`.

## RF-004 — Nada se inserta o resalta sin ser visible

Ya garantizado por el diseño existente (`PartyReference` de solo
lectura, el resto click-to-insert). No requiere cambio.

## Orden de ejecución

RF-001 (lista de referencia) y RF-003 (AI suggestions) son
independientes entre sí. RF-002 no requiere trabajo. Verificación
conjunta al final.

## Verificación

- `npm run typecheck` (web) / `npm run build` (api) limpios.
- En vivo: tab Decision muestra initiator, respondent y la prueba
  guardada en el caso; escribir el número de prueba en el texto de
  Decision resalta esa fila; caso sin `race` guardado → fila de prueba
  no aparece.
- "AI suggestions" visible en el tab Decision, con frases minadas de
  examples con contenido de Decision; 0 examples relevantes → lista
  vacía, no error.
- Revisión con el agente `reviewer` antes de marcar como terminado.

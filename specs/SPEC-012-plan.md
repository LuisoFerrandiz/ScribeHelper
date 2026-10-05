# SPEC-012 — Plan

Relacionado: `SPEC-012-decision-protest-form.md` (requisitos).

## Cambio

`apps/web/src/components/CaseForm.tsx`, bloque `caseTab === 'decision'`
(hoy, antes de esta spec):

```tsx
<SuggestionsPanel
  caseId={caseId}
  box="decision"
  currentText={decision}
  onInsert={(text) => setDecision((prev) => (prev ? `${prev}\n\n${text}` : text))}
  partyReference={{
    initiator: { sailNumber: initiator.sailNumber, boatName: initiator.boatName },
    respondent: { sailNumber: respondent.sailNumber, boatName: respondent.boatName },
    race,
  }}
/>
```

Después:

```tsx
<SuggestionsPanel
  caseId={caseId}
  box="decision"
  currentText={decision}
  onInsert={(text) => setDecision((prev) => (prev ? `${prev}\n\n${text}` : text))}
  protestForm={
    extraction?.decision_candidate
      ? { paragraph: { label: 'From protest form', text: extraction.decision_candidate } }
      : undefined
  }
  partyReference={{
    initiator: { sailNumber: initiator.sailNumber, boatName: initiator.boatName },
    respondent: { sailNumber: respondent.sailNumber, boatName: respondent.boatName },
    race,
  }}
/>
```

Línea a línea, es el mismo prop que ya recibe Conclusion
(`CaseForm.tsx` ~899-903), copiado sin variación de forma —
`extraction`, `decision_candidate` y el shape `{ paragraph: { label,
text } }` de `protestForm` ya existen (`types.ts`, `SuggestionsPanel.tsx`),
no se toca ningún otro archivo.

## Verificación

- `npm run typecheck` (web) limpio.
- Caso de prueba: si existe (o se puede fabricar vía un caso de test
  real) un protest form procesado cuyo `decision_candidate` no esté
  vacío, confirmar que el panel de Decision muestra "From protest
  form" con ese texto, y que insertarlo lo añade a la caja (sin
  sobrescribir lo ya escrito).
- Caso normal (candidato vacío, la mayoría de casos reales): confirmar
  que el panel de Decision se ve exactamente igual que antes de esta
  spec — ninguna sección vacía ni placeholder nuevo.
- Las otras 3 fuentes de Decision (Lista de referencia, Phrases, AI
  suggestions) sin regresión.
- Revisión con el agente `reviewer`: QA de spec/plan antes de
  implementar, validación RF por RF después.

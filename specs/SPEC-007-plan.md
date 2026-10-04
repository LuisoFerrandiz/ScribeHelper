# SPEC-007 — Plan

Relacionado: `SPEC-007-conclusion.md` (requisitos).

## RF-001 — Protest form candidate en Conclusion

`apps/web/src/components/CaseForm.tsx`, bloque `caseTab === 'conclusion'`
(hoy `CaseForm.tsx:845` sin `protestForm`): añadir a la llamada de
`SuggestionsPanel` con `box="conclusion"`:

```tsx
protestForm={
  extraction?.conclusion_candidate
    ? { paragraph: { label: 'From protest form', text: extraction.conclusion_candidate } }
    : undefined
}
```

Mismo patrón exacto que Procedural Matters (`CaseForm.tsx:782-787`),
sin el array `lines` (Conclusion no tiene una variante "discreta" como
`facts_found_candidates` — el propio `extract.ts` documenta que este
campo casi siempre viene vacío). Sin cambios de backend ni de tipos:
`conclusion_candidate` ya existe en `AttachmentExtraction`
(`apps/api/src/ai/extract.ts:14`) y en `apps/web/src/types.ts`.

## RF-002 — Phrases

Sin cambios. `PhrasePicker` ya soporta `box="conclusion"` desde D-022.

## RF-003 — AI suggestions desde examples

Tres archivos, cambio mecánico (ampliar union type + 2 constantes), sin
tocar lógica:

1. `apps/api/src/ai/exampleSuggestions.ts`:
   - `export type ExampleSuggestionBox = 'procedural_matters' | 'facts_found' | 'conclusion';`
   - `BOX_SECTION_HINT`: añadir `conclusion: 'Conclusion'`.
2. `apps/api/src/routes/exampleSuggestions.ts`:
   - `VALID_BOXES`: añadir `'conclusion'`.
3. `apps/web/src/types.ts`:
   - `ExampleSuggestionBox`: añadir `'conclusion'` (mismo union que el
     backend, duplicado igual que ya está para los otros dos valores).
4. `apps/web/src/components/SuggestionsPanel.tsx`:
   - `EXAMPLE_SUGGESTION_BOXES`: añadir `'conclusion'`.

No se toca `suggestPhrasesFromExamples()` ni su prompt — ya reciben
`box` como parámetro y usan `BOX_SECTION_HINT[box]` para el nombre de
sección, sin ningún caso especial por valor.

## RF-004 — Nada se inserta solo

Ya garantizado por el diseño existente de `SuggestionsPanel`/
`PhrasePicker`/`ExamplePhraseSuggestions` (todo botón `onInsert`, nada
en un `useEffect`). No requiere cambio.

## Orden de ejecución

RF-001 (protest form) y RF-003 (AI suggestions) son independientes
entre sí — pueden hacerse en cualquier orden o en paralelo. RF-002 no
requiere trabajo. Verificación conjunta al final (tarea 3 en
`SPEC-007-tasks.md`).

## Verificación

- `npm run typecheck` (web) / `npm run build` (api) limpios.
- En vivo: caso con protest form adjunto que NO menciona conclusión →
  sección "From protest form" no aparece. Caso con protest form que sí
  documenta una conclusión (re-presentado/anotado) → aparece y es
  insertable. Si no hay datos reales de este segundo caso en la DB de
  desarrollo, verificar la rama "vacío" es aceptable y documentarlo.
- "AI suggestions" visible en el tab Conclusion, con frases minadas de
  los examples subidos si alguno tiene contenido de Conclusion;
  comportamiento con 0 examples relevantes: lista vacía, no error.
- Revisión con el agente `reviewer` antes de marcar como terminado.

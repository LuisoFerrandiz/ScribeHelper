# SPEC-020 — Plan

Relacionado: `SPEC-020-lista-unica-sugerencias.md` (requisitos).

Orden: backend (RF-012) → helper y hook → componente → montajes en
`CaseForm` → limpieza → `DECISIONS.md`. Cada paso compila solo.

## 1. Backend — `apps/api/src/routes/phrases.ts` (RF-012)

Mover el filtro de caja a la SQL, antes del `LIMIT`:

```ts
app.get('/phrases/search', (req) => {
  const { q, box } = req.query as { q?: string; box?: string };
  if (!q?.trim()) return [];
  const rows = db
    .prepare(
      `SELECT p.id, p.box, p.label, p.body, p.origin,
              snippet(phrase_fts, 1, '[', ']', '…', 12) AS snippet
       FROM phrase_fts
       JOIN phrase p ON p.id = phrase_fts.phrase_id
       WHERE phrase_fts MATCH ?
         AND (? IS NULL OR p.box = ?)
       ORDER BY rank
       LIMIT 25`,
    )
    .all(q.trim(), box ?? null, box ?? null) as unknown as (PhraseRow & { snippet: string })[];
  return rows;
});
```

`npm run build` en `apps/api`. Sin cambios de esquema ni de rutas nuevas.

## 2. Helper — `apps/web/src/suggestionItems.ts` (nuevo)

```ts
export type SuggestionSource = 'protest_form' | 'hearing_notes' | 'phrase' | 'example';

export interface SuggestionItem {
  id: string;
  text: string;
  source: SuggestionSource;
}

interface CaseSuggestions {
  lines?: string[];
  paragraph?: string;
}

// Case-derived items in the fixed order of SPEC-020 RF-006: protest form
// (lines, then paragraph), then hearing notes (lines, then paragraph).
// Empty / whitespace-only entries are dropped.
export function caseSuggestionItems(protestForm: CaseSuggestions, notes: CaseSuggestions): SuggestionItem[] {
  ...
}
```

`id` = `${source}:${índice}` en lista de origen. Frases: `phrase:${id}`;
ejemplos: `example:${índice}` (los construye el componente).

## 3. Hook — `apps/web/src/useExampleSuggestions.ts` (nuevo, RF-005)

- Caché a nivel de módulo: `Map<ExampleSuggestionBox, string[]>`.
- Estado local: `loading`, `error`, `phrases` (inicial = caché de la caja).
- `request(force?: boolean)`: si ya `loading`, ignora (guarda doble clic);
  llama `api.suggestPhrasesFromExamples(box)`; en éxito guarda en caché
  de **esa caja** y actualiza estado solo si el hook sigue montado y la
  caja no cambió (flag `cancelled` como el componente actual); en error
  no cachea.
- Devuelve `{ phrases, loading, error, requested, request }`.
  `requested` = hay caché o petición hecha, para distinguir "aún no
  pedido" de "pedido y vacío".

## 4. Componente — `apps/web/src/components/SuggestionList.tsx` (nuevo)

Props: `box`, `currentText`, `onInsert`, `items: SuggestionItem[]`
(del caso), `partyReference` no entra aquí (RF-013).

Estado interno:
- `query` (campo "Search suggestions…").
- `browsing: boolean` (botón "Browse phrases"), `browse: PhraseRow[]`.
- `hits: PhraseSearchHit[]` (debounce 300 ms con guarda `cancelled`
  para descartar respuestas superadas).
- `label`, `saving` (guardar como frase).
- ejemplos vía `useExampleSuggestions(box)`.

Render, de arriba abajo, sin plegado:
1. Campo de búsqueda + botones "Browse phrases" y "Suggest from
   examples" (con "Refresh" si ya hay resultados; "Suggesting…" y
   desactivado mientras carga).
2. Lista: items del caso (filtrados por `query` si hay texto) →
   frases (`hits` si hay `query`, si no `browse` cuando `browsing`) →
   ejemplos (filtrados por `query`).
3. Cada elemento: `<button className="suggestion-item" title=...>`
   con el texto recortado por CSS a 3 líneas. Para frases, `title` =
   etiqueta (si existe) + cuerpo; texto visible = cuerpo. Un clic llama
   `onInsert(textoCompleto)`.
4. Mensajes de vacío (RF-008), error (RF-005), "No matches.".
5. Pie: campo "Label (optional)" y "Save current text as phrase" (RF-009);
   tras guardar, vacía etiqueta y refresca `browse` solo si `browsing`.

Sin "(own)", sin etiquetas de origen (RF-011).

## 5. Montajes — `apps/web/src/components/CaseForm.tsx`

Cada una de las cuatro cajas pasa de `<SuggestionsPanel ... />` a:

```tsx
<PartyReference ... />          {/* solo Facts Found y Decision, RF-013 */}
<SuggestionList
  box="..."
  currentText={...}
  onInsert={(text) => setX((prev) => (prev ? `${prev}\n\n${text}` : text))}
  items={caseSuggestionItems(
    { lines: ..., paragraph: extraction?.<box>_candidate },
    { lines: ..., paragraph: notesExtraction?.<box>_candidate },
  )}
/>
```

- Procedural Matters: protest lines = `autoProceduralLines`.
- Facts Found: protest lines = `extraction?.facts_found_candidates`,
  notes lines = `notesExtraction?.facts_found_candidates`.
- Conclusion y Decision: solo `paragraph`.
- `PartyReference` conserva sus props (`initiators`, `respondents`,
  `currentText`, y `race` en Decision) y se monta justo encima de la
  lista dentro de `.suggestions-col`.
- Se retira el prop `caseId` de estos montajes (solo servía a la rama
  `AIDraftPanel`). `GhostTextarea` conserva el suyo.
- El import de `SuggestionsPanel` se sustituye por `SuggestionList`,
  `PartyReference` y el helper.
- La inserción sigue siendo append con `\n\n` (RF-004). No se cambia.

## 6. Limpieza

- Borrar `apps/web/src/components/SuggestionsPanel.tsx`,
  `PhrasePicker.tsx`, `ExamplePhraseSuggestions.tsx` (sustituidos).
- Conservar `AIDraftPanel.tsx` y su ruta sin montar (declarado en D-030).
- `styles.css`: borrar `.suggestions-section-toggle`, `-chevron`, `-body`,
  `.phrase-picker-panel*`, `.suggestions-lines*` y el comentario de
  l.732-733; añadir `.suggestion-list`, `.suggestion-item` (con
  `-webkit-line-clamp: 3`), reutilizando variables existentes.
  `.suggestions-col`, `.suggestions-panel`, `.party-reference*` y
  `.ai-draft-panel-body` se conservan.
- Comentarios en `CaseForm.tsx` ~l.442 que mencionan `SuggestionsPanel`.
- Grep final: ninguna referencia a los tres componentes borrados.

## 7. `DECISIONS.md` — D-030 (append-only)

Entrada nueva, fecha 2026-10-13, accepted: lista única uniforme sustituye
las secciones por origen de SPEC-001/005/017; alternativas (mantener
secciones con botones uniformes; lista mezclada con marca de origen;
frases listadas por defecto); consecuencias (una pulsación más para ver
frases, `AIDraftPanel` sin montar hasta F4/F6, un cambio de backend
acotado en `/phrases/search`). Aclara que D-029 y `constitution.md` no
cambian. Sin editar entradas anteriores.

## 8. Verificación

Según `SPEC-020-lista-unica-sugerencias.md` → Verificación. Para RF-012
también `curl`/UI: buscar un término presente en frases de otra caja y
comprobar que no oculta las de la caja actual.

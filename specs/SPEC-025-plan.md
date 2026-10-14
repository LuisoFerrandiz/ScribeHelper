# SPEC-025 — Plan

Relacionado: `SPEC-025-frases-con-huecos.md` (requisitos).

Todo es cliente (`apps/web`); no hay cambios de API ni de base de datos.
Orden: función pura y su prueba → manejador del cuadro → conexión con las
cajas → texto fantasma. Cada bloque compila solo; la función pura se prueba
con un script desechable sobre las 333 frases reales antes de tocar
componentes.

## 1. Función pura — `apps/web/src/phraseGaps.ts` (nuevo)

```ts
export interface Range { start: number; end: number }
export type PartyLabel = 'X' | 'Y' | 'XY';
export interface PartyRange extends Range { label: PartyLabel }
export interface PhraseGaps { gaps: Range[]; parties: PartyRange[] }

export function normalizePhraseText(text: string): string; // \r\n -> \n
export function phraseGaps(text: string): PhraseGaps;       // RF-001
export function nextGap(gaps: Range[], from: number): Range | null;
export function prevGap(gaps: Range[], before: number): Range | null;
export function replaceParty(zoneText: string, label: 'X' | 'Y', value: string): string;
```

- Escaneo de izquierda a derecha. En cada `[` se busca su pareja contando
  profundidad; sin pareja → texto normal y se sigue en el siguiente carácter.
  Pareja → el rango exterior `[start, end)`; contenido recortado `X` / `Y`
  → **etiqueta de parte** (no hueco); otro contenido → **hueco**.
  Dentro de un hueco no se buscan más corchetes ni etiquetas.
- Etiquetas sueltas fuera de huecos: `X` / `Y` como palabra de una sola letra
  mayúscula; el carácter anterior y el posterior no son letra ni dígito ni `-`;
  `’s` y `'s` pegados se aceptan; un punto final de frase se acepta (se
  comprueba que lo que sigue al punto no es una letra: `X.5` no).
- Grupo de partes: dos etiquetas entre corchetes consecutivas separadas solo
  por espacios, tabuladores o NBSP (o por nada) se funden en una `XY`.
- `replaceParty(zone, 'X', value)`: sustituye cada etiqueta `X` y cada grupo
  `XY` por `value`, y devuelve el texto (los `Y` sueltos de un grupo `XY` se
  van con el grupo). `'Y'` análogo.

## 2. Manejador del cuadro — `GhostTextarea.tsx`

- `forwardRef` + `useImperativeHandle`: `insertAtCaret(text: string): void`.
- Estado: `zone: {start,end} | null`, `touched` (ref: ha tenido el foco),
  `pendingSelection` (ref con el rango a seleccionar tras el render).
- Efecto de layout `[value]`: si hay `pendingSelection`, `setSelectionRange`,
  `blur()` + `focus()` (lleva el hueco a la vista) y se borra.
- `insertAtCaret`: normaliza `\r\n`; calcula posición como en RF-002 (cursor al
  final o nunca enfocado → `\n\n` + texto como hoy; si no, en el cursor,
  sustituyendo la selección); `onChange(nuevo)`; si el texto trae huecos o
  partes, abre la zona `[pos, pos+len)` y deja `pendingSelection` en el primer
  hueco (o en el cursor al final si solo hay partes).
- `onKeyDown`: orden actual (aceptar fantasma con Tab, Escape borra
  fantasma); después, si hay zona: `Tab`/`Shift+Tab` navegan con
  `nextGap`/`prevGap` sobre `phraseGaps(zoneText)` (offsets relativos a la zona);
  `Escape` cierra; en el último hueco `Tab` coloca el cursor al final de la
  zona y la cierra.
- `onChange`: ajusta `zone` por la diferencia de longitud si la edición cae
  dentro o antes de la zona; la cierra si el cambio es de pegar/cortar/deshacer
  (se detecta por `inputType` de `onInput`) o cruza el borde.
- `onBlur`: cierra la zona salvo que el foco vaya a un elemento de la propia
  sección (se marca con `data-gap-ui`); `onClick` la cierra.
- Barra de partes: componente `PartyBar` (en el mismo directorio) bajo el
  `textarea`, con props `parties: {sailNumber, role}[]` (nuevas) y
  `zoneParties` calculado de la zona; un clic aplica `replaceParty` a la zona y
  llama `onChange`; usa `onMouseDown={e => e.preventDefault()}`.
- Props nuevas: `phraseBox?: PhraseBox` (activa fantasma de frases y sesión;
  ausente en Rules Applicable), `parties?: {sailNumber: string; role:
  'initiator' | 'respondent'}[]`. `sailNumberRoles` ya contiene lo mismo: se
  reutiliza para la barra.

## 3. Fantasma de frases — `usePhraseCompletions.ts` (nuevo) y `GhostTextarea`

- `usePhraseCompletions(box)`: carga `api.listPhrases(box)` una vez, devuelve
  `complete(text): string` (RF-007: último párrafo ≥ 12, prefijo sin
  distinguir mayúsculas, estrictamente más larga, la más corta, desempate por
  id). Se recarga con una clave `refreshKey` que sube al guardar una frase.
- `GhostTextarea`: orden del efecto → número de vela → `complete()` → IA con
  debounce como hoy. `acceptSuggestion` abre zona sobre el resto aceptado.

## 4. Conexión — `SuggestionList.tsx`, `CaseForm.tsx`

- `SuggestionList`: `Entry.kind: 'phrase' | 'other'`; botones con
  `onMouseDown={e => e.preventDefault()}`; prop nueva `onInsertPhrase(text)`
  (solo entradas `phrase:`); `onInsert` queda para el resto. Texto de ayuda de
  RF-009 junto a "Save current text as phrase"; tras guardar, `onPhraseSaved()`
  (sube `refreshKey`).
- `CaseForm`: cuatro `useRef<GhostTextareaHandle>` (una por caja con
  librería); `onInsertPhrase={(t) => ref.current?.insertAtCaret(t)}`. Rules
  Applicable no cambia. Los `onInsert` de `\n\n` se conservan para
  protest_form / hearing_notes / example.

## 5. Estilos — `styles.css`

`.gap-hint`, `.party-bar` mínimos (alineados con `suggestion-actions`).

## 6. Documentación

- `DECISIONS.md` D-036: huecos entre corchetes y sesión con Tab; X/Y con barra;
  fantasma de frases en cliente; huecos sin rellenar pueden llegar al
  documento (aviso en F6). Sustituye en lo necesario el "frases con huecos" de
  `CLAUDE.md` (sin editarlo, salvo que el dueño lo pida).
- `issue.md`: F3 → hecha tras el redeploy.

## 7. Verificación

Script `scratchpad/check_gaps.ts` (tarea 2) + en vivo (spec, Verificación 3).

# SPEC-005 — Plan de implementación

Estado: aprobado, sin implementar todavía.

Relacionado: `SPEC-005-procedural-matters.md` (requisitos),
`SPEC-005-tasks.md` (desglose en tareas ejecutables).

## Contexto

RF-001/RF-002 ya están construidos (layout de dos partes, fuente
"Protest form") — nada que hacer ahí. Quedan dos piezas reales:

- RF-003: la librería de frases (`phrase`, D-022) pasa a seedearse
  desde un `.md` convertido del `.xlsx`, no del `.xlsx` directamente.
- RF-004: nueva fuente de sugerencias para `procedural_matters`,
  frases sueltas extraídas de `examples/` aceptados, sustituyendo "AI
  draft" solo para esta caja.

## Diseño — RF-003: pipeline de frases vía `.md`

### El problema real a resolver

`apps/api/src/resources/convert.ts`'s `convertSpreadsheet` (ya
existente, usado para adjuntos/recursos) convierte cada hoja a
`## <nombre hoja>\n\n<tabla HTML>` (`XLSX.utils.sheet_to_html`) — **no**
produce el mismo `[label, body]` por celda que `seedPhrases.ts` lee
hoy directo del `.xlsx` con `XLSX.utils.sheet_to_json`. El parser de
frases tiene que leer esa tabla HTML en vez de celdas de hoja.

### Conversión, una vez

Nueva función en `apps/api/src/db/seedPhrases.ts` (o un archivo nuevo
`apps/api/src/phrases/convert.ts` si crece): antes de parsear,
comprobar si `data/phrases/base/preferred-standard-wording.md` ya
existe (`existsSync`); si no, leer el `.xlsx` de
`apps/api/seed/preferred-standard-wording.xlsx`, convertirlo con
`convertToMarkdown` (reusa la función existente, mismo soporte xlsx ya
usado en todo el proyecto) y escribir el resultado en esa ruta nueva
bajo `data/` (no en `apps/api/seed/`, que es código del repo, no
datos — mismo principio que separa `originals/` de código).
`apps/api/seed/preferred-standard-wording.xlsx` no se toca ni se
borra.

### Parseo del `.md`, no del `.xlsx`

Nuevo parser que sustituye a `parseSimpleSheet`/`parseNoHearingSheet`
actuales (que usan `XLSX.WorkSheet`): divide el `.md` por encabezados
`## <nombre hoja>` (misma lista `SIMPLE_SHEETS` + caso especial `NO
Hearing`, sin cambios en el mapeo hoja→caja, D-022), y dentro de cada
sección extrae filas de la tabla HTML con un regex controlado (el HTML
es generado por nuestro propio `sheet_to_html`, no HTML arbitrario de
internet — un regex `<tr>...</tr>` → `<t[dh]>...</t[dh]>` por fila es
seguro aquí, no hace falta añadir una dependencia de parseo HTML
nueva). Misma lógica de "2 filas de cabecera se saltan" y de
agrupación de "NO Hearing" que hoy, adaptada a leer celdas de tabla en
vez de celdas de hoja.

`seedBasePhrases()` llama a esta conversión+parseo en vez de
`XLSX.read` directo. Su guard existente (`COUNT(*) WHERE
origin='base'`) no cambia — sigue siendo la única comprobación de
idempotencia real; la comprobación de si el `.md` ya existe es solo
para no reconvertir innecesariamente si alguna vez se borra la tabla
`phrase` y se reseeda sin haber borrado el `.md`.

## Diseño — RF-004: sugerencias IA desde `examples/`

### Backend

Nuevo archivo `apps/api/src/ai/exampleSuggestions.ts`, función
`suggestPhrasesFromExamples(box: 'procedural_matters' | 'facts_found'): Promise<string[]>`
— firma genérica desde el inicio (aunque esta spec solo use
`'procedural_matters'`) porque `SPEC-006-facts-found.md` necesita el
mismo patrón para `facts_found`; generalizarla ahora evita duplicar
este archivo cuando se implemente esa spec. No depende de ningún caso
concreto, es sobre el corpus de `examples/` completo:

1. `SELECT markdown_path FROM resource WHERE kind = 'example' AND
   status = 'accepted' AND markdown_path IS NOT NULL` (sin filtrar por
   `scope` — base y own, confirmado).
2. Lee cada `.md` (`readMarkdown`, ya existente en
   `resources/storage.ts`).
3. Envía **el texto completo de cada example** al modelo (no se
   escribe un parser de secciones Markdown a mano — los examples
   vienen con formato libre, D-009/CLAUDE.md "estilo", distinto entre
   sí; pedirle al modelo que localice su propia sección "Procedural
   Matters" es el mismo enfoque que ya usa `extract.ts`, más robusto
   que asumir un encabezado fijo).
4. El prompt pide una lista de frases candidatas para la caja indicada
   (`box`) de **un caso nuevo**, con una etiqueta de sección por caja
   (`BOX_SECTION_HINT: Record<'procedural_matters' | 'facts_found',
   string> = { procedural_matters: 'Procedural Matters', facts_found:
   'Facts Found' }`), instruyendo explícitamente:
   - Usar solo frases presentes o adaptadas de la sección de ese
     nombre (o equivalente) en los examples dados — nunca inventar
     contenido sin respaldo en ellos.
   - **Generalizar cualquier dato específico del caso de origen** —
     números de vela, nombres de barco, fechas, nombres de personas —
     al adaptar una frase; una frase candidata debe ser reutilizable en
     cualquier caso, no citar los datos de un example concreto.
   - Nunca repetir contenido ya cubierto por el otro candidato (sin
     duplicados casi idénticos en la misma lista).
   - Devolver JSON: `{ "phrases": string[] }`.
5. Si no hay ningún example aceptado con contenido de esa sección,
   devolver `{ phrases: [] }` sin error — una lista vacía es mejor que
   una sugerencia inventada (`constitution.md` → Límites no
   negociables).

Ruta nueva: `GET /ai/example-suggestions/:box` (`box` restringido a
`'procedural_matters' | 'facts_found'` por esta y la siguiente spec;
sin `caseId` en la URL — no depende del caso, mismo patrón "stateless"
que `loadAcceptedRuleCorpus` en `draft.ts`, leído de disco en cada
petición, aceptable al volumen actual de examples).

### Frontend

- `apps/web/src/types.ts`: no se necesita tipo `DraftBox`-like nuevo,
  basta un tipo `ExampleSuggestions = { phrases: string[] }`.
- `apps/web/src/api.ts`: `suggestPhrasesFromExamples(box: 'procedural_matters' | 'facts_found'): Promise<ExampleSuggestions>`.
- Nuevo componente `apps/web/src/components/ExamplePhraseSuggestions.tsx`
  — recibe `box` como prop (no hardcodeado a `procedural_matters`),
  mismo patrón de montar-al-expandir que `AIDraftPanel.tsx` (carga en
  `useEffect` al montar, se desmonta al colapsar la sección), pero
  renderiza una lista de botones "+ frase" (click-to-insert), igual
  forma que `SuggestionsPanel.tsx`'s sección "Protest form" ya pinta
  `protestForm.lines`.
- `SuggestionsPanel.tsx`: la sección "AI draft" se bifurca por `box` —
  si `box === 'procedural_matters'`, renderiza
  `<ExamplePhraseSuggestions box={box} onInsert={onInsert} />`; para
  `facts_found` sigue siendo "AI draft" (`AIDraftPanel`) hasta que
  `SPEC-006-facts-found.md` se implemente y active la misma rama para
  ese `box`; para `conclusion`/`decision` sigue renderizando
  `<AIDraftPanel ... />` sin cambios. Título de la sección pasa a "AI
  suggestions" solo para los `box` que usan `ExamplePhraseSuggestions`.

## Verificación

1. `npm run typecheck` en `apps/web`; `npm run build` en `apps/api`.
2. Manual, en vivo contra `http://192.168.1.105:8086/` tras redeploy:
   - Arranque limpio del contenedor (o con `phrase` vacía) → logs
     muestran la conversión del `.xlsx` a `data/phrases/base/
     preferred-standard-wording.md` y el seed de frases con el mismo
     recuento que antes del cambio (verificar que no bajó el número de
     frases `origin='base'` respecto al pipeline anterior).
   - Phrase picker en cualquier caja sigue funcionando igual que hoy
     (sin regresión visible para el usuario).
   - Tab Procedural Matters, sección "AI suggestions": con al menos un
     example aceptado con contenido de Procedural Matters, devuelve
     una lista de frases insertables, ninguna con datos específicos de
     otro caso (sail number/boat name/fecha de un example concreto).
   - Sin ningún example aceptado, o sin `ANTHROPIC_API_KEY`: sección
     vacía o con mensaje de error, nunca una sugerencia inventada.
   - Facts Found/Conclusion/Decision: su "AI draft" sigue funcionando
     exactamente igual que antes (sin regresión).

## Explícitamente fuera de esta spec

- Las mismas exclusiones ya listadas en
  `SPEC-005-procedural-matters.md` → "Explícitamente fuera de esta
  spec".

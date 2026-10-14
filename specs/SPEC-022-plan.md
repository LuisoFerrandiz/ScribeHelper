# SPEC-022 — Plan

Relacionado: `SPEC-022-reglas-aplicables-desde-corpus.md` (requisitos).

Orden: funciones puras y su prueba → base de datos → rutas → arranque →
cliente. Cada bloque compila solo y el parser se prueba con un script
desechable sobre los `.md` reales antes de tocar rutas.

## 1. Funciones puras (sin dependencias de BD)

### `apps/api/src/rules/citation.ts` (nuevo)

```ts
export type CitationPrefix = 'RRS' | 'CR' | 'NoR' | 'SI';

export interface ParsedCitation {
  prefix: CitationPrefix | null; // null = no explicit prefix
  part: string | null;           // 'Addendum E', 'Appendix B'
  number: string;                // canonical: 'C6.1', '44.2'
  suffix: string | null;         // '(a)' — only checked, never indexed
}

export function canonicalNumber(raw: string): string; // upper, 'C.6.1' -> 'C6.1'
export function prefixFor(layer: RuleLayer, docType: DocType | null): CitationPrefix | null;
export function formatCitation(c: { prefix; part; number; suffix? }): string;
export function parseCitation(text: string): ParsedCitation | null; // Rule/R. -> RRS alias
// token-boundary test used by draft.ts (RF-010)
export function containsNumberToken(haystack: string, number: string): boolean;
// RF-003: label depends only on the section's own fields
export function citationFor(s: { prefix; number; part }): string;
// inverse: citation text -> { prefix, part, number, suffix }
export function resolveCitation(text: string): ParsedCitation | null;
```

`prefixFor`: `rrs`→`RRS`, `class`→`CR`, `event`+`nor`→`NoR`,
`event`+`si|si_amendment`→`SI`, `event`+`null`→`null` (sin clasificar).
`containsNumberToken`: coincide si el carácter anterior no es
alfanumérico y el posterior no es alfanumérico ni un `.` seguido de
dígito.

### `apps/api/src/resources/ruleSections.ts` (nuevo)

```ts
export interface RuleSectionDraft {
  number: string;   // canonical
  heading: string;
  body: string;     // heading line + text up to next section
  part: string | null;
  position: number;
}
export function parseRuleSections(markdown: string): RuleSectionDraft[];
```

- Detección de estilo: cuenta cabeceras tab y espacio; gana el mayor
  (empate → tab).
- Tab: `^([A-Z]{0,2}\d+(?:\.\d+)*)[  ]*\t(\S.*)$`.
- Espacio: `^(\d+(?:\.\d+)*)(\.?)\s+(?=[A-Z\[(“"])(.*)$`; número de un solo
  nivel solo si `(\.?)` es punto. Se descartan `^\d+ of \d+`, líneas que
  empiezan por mes y número `0`.
- Parte: línea que, recortada, coincide con
  `^(?:APPENDIX|Appendix)\s+([A-Z]\d?)\b` o
  `^(?:Sailing Instruction|Notice of Race)\s+Addendum\s+([A-Z]\d?)\s*$`
  (el patrón de apéndice solo si es la línea entera, sin tabulador ni
  texto añadido). Se guarda `Appendix X` / `Addendum X`.
- Ancla de parte: `^\s*(?:APPENDIX|Appendix)\s+([A-Z])\s*$` (línea entera;
  `Appendix G is changed to:` no coincide). Cierra el cuerpo anterior.
- Duplicado (número, parte) en el mismo documento: no abre sección nueva.
- Un solo nivel: exige punto, ≤ 99 y texto que empieza por mayúscula,
  `[`, `(` o comillas; dos o más niveles: cualquier primer carácter.
- La etiqueta de parte es **estática** (RF-003): `formatCitation` y
  `resolveCitation` en `citation.ts`, sin leer el corpus.

### Transacciones con `node:sqlite` (B1)
No hay `.transaction()` ni `BEGIN` en el código actual. Helper pequeño
`inTransaction(fn)` síncrono (`BEGIN` / `COMMIT` / `ROLLBACK` en `catch`).
Las lecturas de `.md` (`await`) se hacen **antes**; dentro de la
transacción solo hay operaciones síncronas. `accept` lee el `.md`, y
después hace en la misma transacción `UPDATE` de estado, `INSERT` en
`resource_fts` y las secciones.

### Script de prueba desechable (no se commitea)

`scratchpad/check_f1.ts`: ejecuta `parseRuleSections` y `parseCitation`
sobre los cuatro `.md` de `data/rules/rrs/` y comprueba la lista de
RF/Verificación 2 de la spec. Se ejecuta con `tsx`.

## 2. Base de datos

### `apps/api/db/schema.sql` (solo tablas nuevas)

```sql
CREATE TABLE IF NOT EXISTS rule_section (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resource_id INTEGER NOT NULL REFERENCES resource(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  heading TEXT NOT NULL,
  body TEXT NOT NULL,
  part TEXT,
  position INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rule_section_resource ON rule_section(resource_id);
CREATE INDEX IF NOT EXISTS idx_rule_section_number ON rule_section(number);

CREATE VIRTUAL TABLE IF NOT EXISTS rule_section_fts USING fts5(
  heading, body, section_id UNINDEXED, tokenize = 'unicode61'
);
```

`doc_type` y `sections_indexed_at` **no** van en el `CREATE TABLE`
(rompería sobre la base existente): solo por `ALTER` en `migrate.ts`.

### `apps/api/src/db/migrate.ts`

Dos `ALTER TABLE resource` con guard (patrón SPEC-016/017):
`doc_type TEXT` y `sections_indexed_at TEXT`. Después, el paso de
indexado (RF-014): para cada `resource` `kind='rule' AND
status='accepted' AND sections_indexed_at IS NULL`, `indexResourceSections(id)`
dentro de `try/catch` **por recurso** (cualquier error: aviso por consola,
`ROLLBACK`, la marca queda en `NULL`, se sigue). El arranque no falla.

## 3. Indexado — `apps/api/src/resources/sectionIndex.ts` (nuevo)

```ts
export async function indexResourceSections(resourceId: number): Promise<number>;
export function deleteResourceSections(resourceId: number): void;
```

`indexResourceSections` lee el `.md`, llama a `parseRuleSections`, y en
una transacción borra las secciones previas del recurso (FTS por
`section_id` con `Number(...)`, D-023), inserta las nuevas y sus filas
FTS, y pone `sections_indexed_at`. `deleteResourceSections` hace el
borrado explícito del FTS antes del cascade.

## 4. Rutas

### `routes/resources.ts`
- `POST /resources`: para `layer='event'` exige `doc_type` válido
  (`nor|si|si_amendment`), si no 400; lo guarda. Otras capas: `NULL`.
- `accept`: tras el `UPDATE`, `indexResourceSections`, dentro de la misma
  transacción lógica con el índice de documento.
- `reclassify`: acepta `layer`, `event_id`, `doc_type`; `doc_type` →
  `NULL` si sale de `event` o pasa a ejemplo; al pasar a `example` o
  cambiar capa/`doc_type`, `deleteResourceSections` y, si queda `rule`
  aceptado, `indexResourceSections`.
- `reject` y `DELETE /resources/:id`: `deleteResourceSections` antes del
  borrado de la fila.
- `GET /resources/:id`: añade `sectionsPreview: { count, sample }`
  calculado en memoria con `parseRuleSections` (para la revisión,
  RF-013), sin escribir.

### `routes/rules.ts` (nuevo) — `GET /rules/search`
1. Resuelve `event_id` del caso por `case_id`.
2. Si `q` parsea como cita/número, trae secciones de número exacto
   (máx. 10), parte nula primero.
3. FTS: `q` saneada (cada término `"término"`) sobre
   `rule_section_fts`, hasta completar 25 sin repetir ids.
4. Filtra por recursos `accepted`, capa `event` solo del evento del caso,
   y calcula la cita con `prefixFor` + parte (RF-003: Addendum siempre,
   Appendix solo si el número se repite en el documento).
5. Marca `cited` mirando las citas del caso (forma canónica).

### `routes/ruleCitations.ts` (nuevo) — alta validada
- `POST /rule-citations` `{ case_id, text }` o `{ case_id, section_id }`
  (el botón). Con `section_id` se valida que la sección es de un recurso
  `accepted` y, si es `event`, del evento del caso. `parseCitation` → prefijo implícito `RRS` solo si existe sin
  parte en `rrs` (RF-007) → comprueba número base y sufijo en
  `rule_section` del prefijo y evento del caso (RF-009) → rechaza
  duplicado canónico (RF-008) → inserta con `rule_reference` canónico y
  `position` calculado en servidor.
- Respuestas de error: 422 con `{ error }` en inglés (RF-012).

### `routes/crud.ts` y `routes/index.ts`
- `CrudOptions` gana `skipCreate` y `skipUpdate`.
- `rule-citations` se registra con `skipCreate: true, skipUpdate: true`
  (mantiene GET y DELETE genéricos).

## 5. `ai/draft.ts`
- `CITATION_PATTERN` acepta `RRS|Rule|CR|NoR|SI` más parte opcional.
- `extractCitations` devuelve `{prefix, part, number}`; `CITATION_PATTERN`
  ancla `NoR|CR|SI` en su forma canónica.
- `validateCitations(references, caseId)`: usa `rule_section` (prefijo,
  evento, número) y `containsNumberToken`; ya no recibe el corpus
  concatenado. Se conserva la firma pública en lo posible.
- `findExcerpt`: cuerpo de la sección (máx. 1500 caracteres) del documento
  aceptado más reciente, o `null`.
- `loadAcceptedRuleCorpus` se elimina si queda sin uso.

## 6. Cliente

### `apps/web/src/types.ts` / `api.ts`
- `DocType`, `RuleSearchHit`, `ResourceRow.doc_type`/`sections_indexed_at`,
  `ResourceFull.sectionsPreview`. `api.searchRules(q, caseId)`,
  `api.addRuleCitation(...)`; `reclassifyResource` con `doc_type`.

### `ResourceUpload.tsx`
- Si `kind='rule'` y capa `event`: selector `doc_type` obligatorio;
  deshabilita "Upload" sin él.
- Reclasificar: dropdown de capa y, si `event`, regata (la actual) y
  `doc_type`; mantiene "Move to examples/rules".
- Revisión: muestra "N rules detected", muestra de citas y el aviso de 0.

### `RulePicker.tsx` (nuevo), `RulesSuggestions.tsx` (SPEC-023) y `CaseForm.tsx`
- `RulePicker` (búsqueda con debounce 300 ms y guarda anti-carrera,
  resultados con cita, título, documento, fragmento y "Add") se monta
  **dentro** de `RulesSuggestions.tsx` de SPEC-023; no hay un segundo hueco.
  "Add" desactivado si `cited` o documento sin clasificar (con motivo).
- "Add" llama a la alta validada y, con la respuesta, `CaseForm` inserta la
  cita en el cuadro `rules_applicable` (un solo clic, RF-005).
- `handleAddRule` llama a la nueva API; muestra el error del servidor. Se
  retira el estado `ruleQuery/ruleHits/searching` de `CaseForm` si SPEC-023
  no lo movió ya.

## 7. `DECISIONS.md` — D-034 (append-only; D-031 es la del menú Jury, D-032 la de SPEC-023 y D-033 la de actualizar CLAUDE.md y constitution.md)
Citas por regla, formato canónico y partes, `doc_type`, índice por
regla, validación en servidor, bloqueo de PUT/POST genéricos. Registra también que las citas antiguas no se migran ni se marcan y por
qué (D-004). Alternativas:
solo número con comprobación (opción C), primera aparición citable,
texto libre con marca "unverified". Sustituye el diseño por documento de
D-011/D-020 en lo que respecta a citas. No edita D-004.

## 8. Despliegue y riesgos operativos
- Antes del redeploy: el dueño copia `data/db` (el arranque añade dos
  columnas y rellena el índice).
- Tras el redeploy: el arranque indexa los recursos ya aceptados;
  reclasificar el NoR y las SI de París a `event` con su `doc_type`.
- Verificación: la de la spec (script + en vivo + tras redeploy).

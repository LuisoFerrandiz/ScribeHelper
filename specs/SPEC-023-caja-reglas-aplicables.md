# SPEC-023 — Rules Applicable como caja de redacción

Estado: implementada en local (draft v2 confirmado por el dueño, 2026-10-14). Pedida por el dueño (2026-10-14): Rules Applicable
tiene, como las otras cuatro cajas, **sugerencias del sistema a la
izquierda y un cuadro de texto a la derecha**, y ese cuadro aparece también
en Review entre Conclusion y Decision. Opción A del dueño: campo de texto
propio, "igual que en las otras pestañas" (incluido el texto fantasma).
v2 incorpora la revisión del `reviewer` (3 bloqueos, 8 importantes).
**Pendientes de confirmar con el dueño:** las dos decisiones marcadas
"propuesta" (texto fantasma sin números de regla; un clic de "Add" hace dos
cosas). Va **antes** de SPEC-022 (F1), que construirá el "Add" sobre esta
caja.

Relacionado: SPEC-021 (pestaña propia; sus RF-003/RF-004 "contenido sin
cambios" quedan superados por esta spec), SPEC-020 (`SuggestionList`, que
esta caja **no** reutiliza), SPEC-014 (Save único), SPEC-022 (F1),
`DECISIONS.md` D-004 (nada se cita fuera del corpus), D-014 (tabla
`case_rule_citation` en vez de columna de texto), D-025 (texto fantasma),
D-029 (coherencia entre pestañas), `constitution.md`, `CLAUDE.md` ("Cajas
escritas por el humano").
`apps/web/src/components/CaseForm.tsx` (pestaña `rules`, Review),
`GhostTextarea.tsx`, `format.ts`, `apps/api/db/schema.sql`,
`db/migrate.ts`, `routes/index.ts`, `routes/complete.ts`,
`ai/complete.ts`, `ai/draft.ts`.

## Intención

Hoy Rules Applicable es una lista de citas (`case_rule_citation`) con
Remove, un campo para teclear una cita y un buscador de corpus de solo
lectura; el texto del documento sale de esa lista. Las otras cuatro cajas
son un cuadro de redacción con sugerencias al lado. El dueño quiere que
Rules Applicable sea una caja más: el juez **escribe** la sección (por
ejemplo "RRS 44.2 applies because …"), con el sistema sugiriendo reglas.

## Tensiones con reglas existentes (declaradas, no ocultas)

- **CLAUDE.md y `constitution.md`** dicen que solo hay cuatro cajas
  escritas por el humano y que Rules Applicable es un híbrido de lista
  cerrada y validada; D-014 eligió una tabla y descartó una columna de
  texto. Esta spec **cambia ese modelo por decisión expresa del dueño**.
  D-032 lo registra: sustituye parcialmente a D-014 (se añade la columna;
  la tabla `case_rule_citation` queda como registro validado) y fija una
  excepción a "solo cuatro cajas". Actualizar el texto de `CLAUDE.md` y de
  `constitution.md` queda en manos del dueño (se pidió no modificar
  `CLAUDE.md` en este replanteo); esta spec no los toca.
- **D-004 (nada se cita fuera del corpus).** Un cuadro de texto libre
  permite escribir una regla sin validar. SPEC-022 valida lo que se
  **añade al registro**, no lo que se teclea en el cuadro. Hasta que una
  spec posterior valide las referencias escritas a mano en el cuadro (se
  propone como parte de F6, "cadena coherente"), el cuadro es redacción del
  juez, no una cita validada. Mitigaciones de esta spec: la IA no sugiere
  números de regla en este cuadro (RF-003), y el aviso de RF-011 muestra qué
  citas validadas no están en el texto.
- **D-029 regla 1** (un modo de presentación por pestaña): la pestaña
  mezcla una caja de documento con controles de alta y un buscador, como ya
  admitía SPEC-021 ("Coherencia"). Se mantiene como excepción conocida.
- **SPEC-014 RF-006** ("Rules Applicable actúa al instante, sin Save"): se
  conserva para Add/Remove de citas del registro; el **texto del cuadro**
  se guarda con el Save único (RF-008). Dos modelos de guardado en la misma
  pestaña, a propósito, y se dice en la UI (RF-004).

## Hechos del código (verificados 2026-10-14)

- `protest_case` no tiene `rules_applicable`; `formatRulesApplicable`
  (`format.ts`) concatena `ruleCitations[].rule_reference`; los consumidores
  reales son el Copy de la caja (`CaseForm.tsx`) y el HTML del documento
  (`format.ts`, `formatFullDecisionHtml`). `formatFullDecision` es código
  muerto.
- `phrase.box` tiene `CHECK` de 4 valores (`schema.sql`); no se amplía sin
  recrear la tabla. El material base no tiene sección de Rules Applicable.
- `GhostTextarea`, `api.completeInline`, `routes/complete.ts`
  (`VALID_BOXES`), `ai/complete.ts` (`BOX_LABEL`) y `ai/draft.ts`
  (`DraftBox`) están tipados con las cuatro cajas. `GhostTextarea` solo
  dispara con ≥ 15 caracteres (`MIN_CHARS`).
- `routes/index.ts` lista los `fields` de `cases`; `crud.ts` ignora en
  silencio los campos no listados. `types.ts` tiene `CaseRow`/`CaseFull`.
- `reload()`, `handleSaveAll` y el overlay `liveCase` de `CaseForm.tsx`
  son el ciclo de carga, guardado y lectura en pantalla de las cajas;
  `refreshRuleCitations` toca solo `ruleCitations`.
- La pestaña Review tiene cuatro `textarea` y no incluye Rules Applicable.
- `.suggestion-item` es un `<button>` (`SuggestionList.tsx`); un botón con
  otro botón dentro es HTML inválido.
- `ai/draft.ts` construye el prompt desde `case_rule_citation`.
  `AIDraftPanel` no está montado (D-030): impacto latente.
- `GET /cases/:id/full` devuelve `SELECT *`: la columna nueva llega al
  cliente sin tocar `caseDetail.ts`.
- Los resultados del buscador de corpus son **documentos**, sin número de
  regla: no se pueden insertar como cita hasta SPEC-022.

## Alcance

**Dentro:**
1. Campo `protest_case.rules_applicable`, por `ALTER` guardado.
2. Pestaña "6. Rules Applicable": cuadro (con texto fantasma) a la derecha,
   sugerencias a la izquierda.
3. El cuadro en Review entre Conclusion y Decision.
4. Copy, Download y documento completo con el texto del cuadro.
5. Aviso de citas registradas que no están en el texto.
6. D-032 en `DECISIONS.md`.

**Fuera de esta spec:**
- Botón "Add" desde el corpus, formato canónico, validación en servidor y
  `doc_type`: **SPEC-022**.
- Validar las referencias escritas a mano en el cuadro contra el corpus
  (propuesto para F6), y reglas sugeridas desde Facts Found (F5).
- Frases de librería y "Suggest from examples" para esta caja; "Save as
  phrase" (requeriría recrear `phrase`).
- Incluir el texto del cuadro en `ai/draft.ts`: **ignorado a propósito** (el
  panel de borrador no está montado, D-030); F4/F6 lo decidirán.
- Migrar o reescribir citas existentes.

## Requisitos funcionales

- **RF-001 — Campo.** `protest_case.rules_applicable TEXT NOT NULL DEFAULT ''`.
  Se añade por `ALTER` guardado en `migrate.ts`, también en una base nueva
  (el `ALTER` del arranque la crea), no en el `CREATE TABLE`. Se añade a
  los `fields` de `cases` en `routes/index.ts` y a `CaseRow`/`CaseFull` en
  `types.ts` (si no, el `PUT` lo ignora o `updateCase` no compila).
- **RF-002 — Disposición.** `CopyBox` con `box-body-split`, igual que las
  otras cajas. El DOM mantiene el orden de las otras cajas (cuadro primero,
  sugerencias después), para conservar orden de lectura y de Tab. En
  pantalla ancha se invierte solo visualmente con un modificador CSS
  (`.box-body-split-reverse`, `flex-direction: row-reverse`): sugerencias a
  la izquierda, cuadro a la derecha (decisión del dueño). En ≤ 720 px se
  apilan con el cuadro arriba, como las demás. El cuadro usa `rows` como
  Conclusion.
- **RF-003 — Texto fantasma.** `GhostTextarea` para `rules_applicable`, Tab
  acepta, mismos tiempos y `MIN_CHARS` que las otras cajas. `POST
  /cases/:id/complete` acepta la caja nueva. **Propuesta:** en esta caja la
  IA continúa solo redacción en prosa (por ejemplo "… applies because the
  boat …") y **nunca escribe un número de regla, un prefijo (RRS, NoR, SI,
  CR) ni un apartado**; si el texto termina en una referencia a medio
  teclear, no devuelve nada. El prompt de esta caja es propio, no el de las
  otras cuatro (`ai/complete.ts` añade una rama por caja). Sin la clave
  `ANTHROPIC_API_KEY` el texto fantasma falla en silencio, como hoy.
- **RF-004 — Sugerencias del sistema (izquierda).** Componente propio
  `RulesSuggestions.tsx`, **sin** frases, "Browse phrases", "Suggest from
  examples" ni "Save as phrase". Contiene, de arriba abajo:
  1. buscador del corpus: resultados de **solo lectura** con la etiqueta
     "Read-only until rules can be added from the corpus", estado
     transitorio hasta SPEC-022;
  2. **citas registradas** del caso: cada fila tiene un botón que inserta su
     texto en el cuadro y, al lado (hermano, no anidado), un botón
     "Remove" del registro;
  3. campo "e.g. RRS 18.2(b)" con "Add" para registrar una cita a mano
     (SPEC-022 lo sustituirá por validación y botones);
  4. una línea fija: "Cited rules save instantly. The text box saves with
     Save."
  Nada se inserta en el cuadro sin un clic (`constitution.md`). El estilo
  reutiliza `.suggestion-item`; `.rule-picker` se conserva dentro de este
  componente.
- **RF-005 — Inserción.** Un clic en una cita registrada añade
  `rule_reference` (solo la cita, sin texto de la regla) al cuadro:
  `prev ? prev + '\n' + cita : cita` (sin salto inicial si está vacío). Un
  doble clic inserta dos veces, igual que en las otras cajas. Registrar una
  cita (RF-004.3) **no** la inserta sola.
- **RF-006 — Review.** Review muestra un `textarea` de Rules Applicable
  entre Conclusion y Decision, ligado al mismo estado.
- **RF-007 — Salida del documento.** `formatRulesApplicable` devuelve el
  texto del cuadro si `trim()` no está vacío. Si está vacío y hay citas
  registradas, devuelve la lista de citas como hoy (los casos anteriores
  siguen saliendo sin migración); si no hay ni texto ni citas, `—`. Los
  consumidores son el Copy de la caja y el HTML del documento.
- **RF-008 — Guardado.** El texto es un `useState` rellenado en `reload()`,
  incluido en `handleSaveAll` y en el overlay `liveCase` (para que Copy,
  Download y Review lean lo que hay en pantalla y no lo guardado).
  `refreshRuleCitations` sigue tocando solo `ruleCitations` y nunca llama a
  `reload()` (no debe pisar texto sin guardar). Sin guardado automático. Con
  dos pestañas abiertas gana el último guardado, como en las otras cajas.
- **RF-009 — Citas existentes intactas.** No se modifica
  `case_rule_citation` ni se escribe nada en `rules_applicable` por sí solo.
  Quitar una cita del registro no borra su texto del cuadro.
- **RF-010 — Mensajes.** Todo texto visible en inglés.
- **RF-011 — Aviso de divergencia.** Cuando el texto del cuadro no está
  vacío y alguna cita registrada **no aparece** en él (coincidencia por
  límites de token, sin distinguir mayúsculas), la pestaña muestra "N cited
  rules are not in the text and will not appear in the document" con un
  botón "Insert missing" que las añade al final (una por línea). Es la
  protección contra perder reglas en silencio cuando el juez empieza a
  escribir en un caso con citas. Con el cuadro vacío no se muestra (el
  documento ya usa el registro, RF-007).

## Decisiones técnicas propuestas

- Tipo `RulesBox = PhraseBox | 'rules_applicable'` solo en
  `GhostTextarea`, `api.completeInline`, `routes/complete.ts` y
  `ai/complete.ts`. `draft.ts` (`DraftBox`), `exampleSuggestions.ts` y
  `PhraseBox` **no cambian**: la librería de frases y su `CHECK` quedan
  intactos.
- `RulesSuggestions.tsx` extrae de `CaseForm.tsx` el bloque actual (citas,
  alta manual, buscador); SPEC-022 meterá su `RulePicker` **dentro** de este
  componente en vez de crear otro hueco. `CaseForm` sigue teniendo los
  manejadores `handleAddRule` y `handleRemoveRule` (recibidos por props).
- Se elimina el CSS que queda sin uso al mover el bloque.
- **D-032** en `DECISIONS.md` (la de citas de SPEC-022 pasa a D-033):
  Rules Applicable pasa de lista de citas a caja de redacción con registro
  de citas; sustituye parcialmente a D-014; excepción a "solo cuatro cajas"
  de CLAUDE.md y `constitution.md`; excepción conocida a D-029 regla 1;
  registra la tensión con D-004 y sus mitigaciones. No edita D-004.
- **Sincronía con SPEC-022:** su RF-005 pasa a "un clic de Add registra la
  cita **y** la inserta en el cuadro" (propuesta de esta spec); su RF-011 se
  reescribe (Copy/Review/Download salen del cuadro, no de `rule_reference`);
  su `RulePicker` vive dentro de `RulesSuggestions`; su numeración D-032
  pasa a D-033; su verificación se rehace sobre esta pestaña.

## Riesgos

- **Dos fuentes de verdad** (texto y registro): pueden divergir. RF-011 lo
  hace visible; F1 acerca ambas; F6 podrá avisar de desfase.
- **Referencias sin validar en el cuadro** (D-004): ver "Tensiones".
- **Casos antiguos:** el documento depende de si el cuadro está vacío
  (RF-007). El aviso de RF-011 cubre el cambio de comportamiento al empezar
  a escribir.
- **Orden visual invertido** respecto a las otras cajas: decisión del
  dueño; el orden de Tab y de lectura se mantiene.
- **Datos en producción:** solo una columna aditiva con valor por defecto.
- **`CaseForm.tsx` ya es grande** (ISS-006): el bloque se mueve a
  `RulesSuggestions.tsx`; el estado del cuadro suma pocas líneas.

## Verificación

1. `npm run build` (api) y `npm run typecheck` (web) limpios.
2. En vivo en `http://192.168.1.105:8086/`, caso de prueba:
   - sugerencias a la izquierda y cuadro a la derecha; en ventana estrecha,
     cuadro arriba;
   - texto fantasma con Tab (≥ 15 caracteres), que no escribe números de
     regla; sin `ANTHROPIC_API_KEY` no rompe;
   - registrar una cita a mano la lista; un clic la añade al cuadro en
     línea nueva (sin salto inicial con el cuadro vacío); Remove la quita
     del registro sin borrar el texto;
   - Save y recargar conserva el texto; sin Save, recargar lo descarta;
   - Review muestra el cuadro entre Conclusion y Decision y los cambios se
     reflejan en ambos sitios;
   - Copy y "Download decision (.html)" usan el texto del cuadro;
   - caso antiguo con citas y cuadro vacío: Copy y documento siguen con las
     citas; al escribir algo, aparece el aviso y "Insert missing" las
     recupera;
   - las otras cuatro cajas no cambian.
3. Tras "Pull and redeploy": reconfirmar lo anterior en producción.

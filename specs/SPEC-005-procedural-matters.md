# SPEC-005 — Procedural Matters

Estado: draft (parcialmente ya construido, con cambios nuevos sobre lo
existente — ver "Alcance").

Relacionado: `CLAUDE.md` (Los dos mecanismos de sugerencia; nota de
estado 2026-10-04, que señalaba `examples/` como nunca alimentado a la
IA — esta spec cierra ese gap, solo para esta caja), `constitution.md`
→ Principios (preferir lo determinista; nada se inserta sin acción
explícita), `DECISIONS.md` D-007 (tres almacenes de material), D-022
(librería de frases seeded desde Excel), D-024 (panel de borrador IA +
validación de citas), `SPEC-003-documentacion-previa.md` (fuente 1 de
sugerencias aquí).

## Intención

La caja "Procedural Matters" ya tiene layout de dos partes: una donde
el usuario escribe libremente, y una columna de sugerencias aparte.
Esta spec documenta esa estructura ya construida y define 3 fuentes de
sugerencia concretas para esta caja — dos ya existentes (ajustando una
de ellas), una nueva.

## Alcance

**Dentro:**
- Confirmar que el layout de dos partes (texto libre + sugerencias) ya
  cumple lo pedido — es el mismo patrón ya construido para esta y las
  otras 3 cajas de texto libre.
- **Fuente 1 — Protest form** (ya construida, sin cambios): sugerencias
  desde el `.md` de los adjuntos del caso, vía `extraction` de
  SPEC-003. Sin cambios en esta spec.
- **Fuente 2 — Phrases** (ya construida, **con un cambio de pipeline**):
  la librería de frases seeded desde el Excel "Preferred Standard
  Wording" (D-022) pasa a leerse desde un `.md` convertido una vez,
  no del `.xlsx` directamente — ver "Cambio de pipeline" abajo. Afecta
  a las 4 cajas que usan `phrase` (`procedural_matters`, `facts_found`,
  `conclusion`, `decision`), no solo a esta, porque la tabla `phrase`
  es compartida — se especifica aquí porque esta es la spec que lo
  pidió.
- **Fuente 3 — AI sobre examples** (**nueva**, sustituye a "AI draft"
  para esta caja): en vez de un borrador alternativo completo, la IA
  lee las secciones "Procedural Matters" de los `examples/` (base +
  own) ya aceptados y propone frases sueltas, click-to-insert — mismo
  patrón que `facts_found_candidates` de SPEC-003.

**Fuera (de esta spec):**
- Cambiar "AI draft" para `facts_found`/`conclusion`/`decision` — sigue
  igual (borrador completo alternativo) hasta que le toque su propia
  spec, por el acuerdo ya establecido de ir "una por una".
- Botón de descarga del `.xlsx` original en la UI — explícitamente no
  pedido; el archivo sigue solo en el servidor (`apps/api/seed/`), como
  hoy.
- Tab "2. Jury" — aplazado, se añadirá en otra spec (indicación
  explícita del usuario en este mismo hilo).

## Requisitos

**RF-001 — Dos partes separadas**
Dado el tab "3. Procedural Matters", cuando el usuario lo abre,
entonces ve dos zonas: una caja de texto editable (lo que escribe el
usuario) y, aparte, un panel de sugerencias con 3 secciones
colapsables. (Ya cumplido: `CaseForm.tsx:755-770`, `box-body-split`.)

**RF-002 — Fuente 1: Protest form**
Sin cambios respecto a SPEC-003/SPEC-004: sugerencias desde la
extracción de los adjuntos del caso, click-to-insert. (Ya cumplido.)

**RF-003 — Fuente 2: Phrases, ahora desde `.md`**
Dado el `.xlsx` "Preferred Standard Wording" en
`apps/api/seed/preferred-standard-wording.xlsx`, cuando el servidor
arranca por primera vez (o el `.md` convertido no existe todavía),
entonces se convierte una vez a Markdown y se guarda — ese `.md` pasa
a ser la fuente que se parsea para poblar `phrase` (origin `base`), no
el `.xlsx` directamente. El `.xlsx` original no se borra ni se
sustituye — sigue en el servidor sin cambios, sin botón de descarga en
la UI.

**RF-004 — Fuente 3: sugerencias IA desde `examples/`**
Dado al menos un `example` aceptado (`resource.kind = 'example'`,
`status = 'accepted'`, `scope` `base` u `own`) con una sección
"Procedural Matters" no vacía, cuando el usuario abre la sección "AI
suggestions" (sustituye a "AI draft" para esta caja) del panel,
entonces la IA devuelve una lista de frases candidatas — nunca un
párrafo único — extraídas/inspiradas en esas secciones, cada una
insertable con un click independiente, igual patrón que
`facts_found_candidates`.

**RF-005 — Nada se inserta sin click**
Ninguna de las 3 fuentes escribe en la caja de texto sin una acción
explícita del usuario — ya cumplido para fuentes 1 y 2, mismo
principio aplica a la fuente 3 nueva (`constitution.md` → Límites no
negociables).

## Cambio de pipeline — fuente 2 (Phrases)

Hoy `seedPhrases.ts` lee el `.xlsx` con la librería `xlsx` y parsea
sus hojas directamente (`XLSX.read`/`sheet_to_json`) cada vez que
arranca el contenedor (no-op si ya hay filas `origin='base'`).

Cambio: antes de parsear, convertir el `.xlsx` a `.md` una sola vez
(reutilizando `convertToMarkdown` de `resources/convert.ts`, mismo
soporte ya usado para adjuntos y recursos) y guardar ese `.md` en
disco (bajo `data/`, no en `apps/api/seed/` — ese directorio es código
del repo, no datos). El parseo de frases pasa a leer ese `.md`
guardado, no el `.xlsx` cada vez — más rápido en arranques siguientes,
mismo resultado final en la tabla `phrase`. Si el `.md` ya existe, no
se reconvierte (mismo patrón idempotente que el resto del proyecto).

**Riesgo a resolver en el plan, no aquí**: convertir una hoja de Excel
a Markdown probablemente produce una tabla Markdown por hoja, no el
mismo formato `[label, body]` por fila que `parseSimpleSheet` espera
hoy directamente del `.xlsx` — el parser de frases tendrá que leer esa
tabla Markdown en vez de celdas de hoja. Diseño exacto: `SPEC-005-plan.md`.

## Fuente 3 — diseño funcional (detalle en el plan)

- Universo de examples: `kind = 'example'`, `status = 'accepted'`,
  cualquier `scope` (`base` y `own`, confirmado por el usuario).
- Cada example es una decisión completa convertida a `.md` — hace
  falta aislar solo su sección "Procedural Matters" antes de pasarla a
  la IA (un example que no tenga esa sección, o la tenga vacía, se
  excluye silenciosamente, no es un error).
- La IA nunca inventa una frase de la nada — se le pide extraer o
  adaptar frases ya presentes en esas secciones, no redactar contenido
  nuevo sin respaldo (mismo principio que D-024: "cuando no está
  seguro, lo dice" aplicado aquí como "no inventa").
- Las frases propuestas no son reglas ni se presentan como tales
  (mismo principio que la librería `phrase`, D-007).

## Seguridad y privacidad

- Fuente 3 requiere `ANTHROPIC_API_KEY` (igual que el resto de
  features con IA) — su ausencia deja esa sección sin resultados, sin
  romper el resto del tab.
- Sin cambio en qué datos personales se envían al modelo: los
  `examples/` ya son el corpus de estilo existente, mismo tratamiento
  que D-024 ya aplica a los datos del propio caso.

## Decisiones técnicas

- Librería de frases: conversión a `.md` intermedio, confirmado por el
  usuario — detalle de implementación en `SPEC-005-plan.md`.
- `.xlsx` original: sigue solo en el servidor, sin botón de descarga —
  confirmado explícitamente por el usuario.
- Fuente 3 sustituye "AI draft" **solo para `procedural_matters`** —
  las otras 3 cajas (`facts_found`, `conclusion`, `decision`) se
  revisan en sus propias specs futuras, no aquí.
- Formato de la fuente 3: frases sueltas click-to-insert, nunca un
  párrafo único — confirmado explícitamente por el usuario.

## Explícitamente fuera de esta spec

- Tab "2. Jury" — aplazado a una spec futura.
- Cambiar "AI draft" en Facts Found/Conclusion/Decision.
- Botón de descarga del `.xlsx` original.
- Indexar `examples/` en FTS (`resource_fts` hoy solo indexa `kind =
  'rule'`, comentario explícito en `schema.sql:201`) — la fuente 3 lee
  los `.md` de examples directo, no vía búsqueda FTS; si el volumen de
  examples crece mucho, optimizar la carga es una spec aparte.

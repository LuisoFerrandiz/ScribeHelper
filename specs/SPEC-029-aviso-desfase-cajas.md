# SPEC-029 — Aviso de desfase entre cajas

Fase F6, tercer trozo (`issue.md` ISS-010). Estado: v2 (tras `reviewer`: 2 casi bloqueantes y 7 medios recogidos).

## Problema

La decisión es una cadena: Facts Found → Rules Applicable → Conclusion →
Decision. Si el juez cambia un hecho probado después de haber escrito la
conclusión o la decisión, estas pueden haber quedado desfasadas y nada avisa.

## Alcance

Solo **avisar** (como SPEC-026 y SPEC-028). Sin IA. Necesita saber *cuándo*
se cambió cada caja, algo que hoy no se guarda: marcas de tiempo por caja,
puestas por el servidor al guardar.

Fuera: la IA leyendo las cajas anteriores (otro trozo), Procedural Matters
(no es parte de la cadena), historial de versiones.

## Modelo

- Cuatro columnas aditivas en `protest_case` (migración idempotente con
  `PRAGMA table_info`, como las de SPEC-016/017/023): `facts_found_at`,
  `rules_applicable_at`, `conclusion_at`, `decision_at` (`TEXT`, sin valor por
  defecto = nulo).
- El servidor las pone a `datetime('now')` en `PUT /cases/:id` **solo para las
  cajas cuyo valor recibido difiere del guardado**. Guardar sin cambiar no
  mueve la marca. Un Save que cambia varias cajas les da la **misma** marca.
- Una caja está **desfasada respecto a otra anterior** cuando ambas marcas
  existen y la de la anterior es **estrictamente mayor**. Marca nula = no se
  sabe = sin aviso (datos existentes, cajas nunca escritas).
- Dependencias: Rules ← Facts; Conclusion ← Facts, Rules; Decision ←
  Facts, Rules, Conclusion.
- "Revisada": `POST /cases/:id/box-reviewed` con `{ box }` (una de las tres
  cajas con anteriores) pone la marca de esa caja a `datetime('now')` sin
  tocar el texto. Es la forma de decir "lo he mirado y sigue valiendo".

## Requisitos

- **RF-001 Migración** de las cuatro columnas, idempotente; en
  `schema.sql` (instalaciones nuevas) y en `migrate.ts` (existentes).
  Cajas con texto previo conservan marca nula.
- **RF-002 Marca al guardar** en el PUT genérico de `cases` mediante una
  opción de `registerCrud` (`stampOnChange: { campo: columna_at }`): lee la
  fila antes del UPDATE, compara y añade `columna_at = datetime('now')` para
  las que cambian. Sin efecto en otras tablas. La respuesta del PUT incluye
  las marcas nuevas.
- **RF-003 Ruta** `POST /cases/:id/box-reviewed` (`conclusion`,
  `rules_applicable`, `decision`; otro valor → 400; caso inexistente → 404).
  Devuelve las cuatro marcas.
- **RF-004 Tipos y estado**: `CaseRow` gana las cuatro marcas (`string |
  null`); tras Save, `CaseForm` copia las marcas de la respuesta del PUT a
  `caseFull` sin tocar los textos en edición.
- **RF-005 Función pura** `staleSources(box, stamps)` en
  `apps/web/src/staleBoxes.ts`: devuelve los nombres de las cajas anteriores
  con marca mayor que la de `box` (ambas no nulas). Sin DOM ni red.
- **RF-006 UI** Bajo la cabecera de Rules Applicable, Conclusion y Decision
  (`CopyBox`, visible aunque esté colapsada, como `pending-note`): "Facts
  Found changed after this box was last edited." (lista las cajas) y un botón
  **"Mark as reviewed"** que llama a la ruta y actualiza las marcas. Sin
  aviso si no hay desfase.
- **RF-007** Los cambios **sin guardar** no cuentan: el aviso se calcula con
  lo guardado. Cambiar un hecho y guardar activa el aviso; teclear en la
  caja desfasada y guardar la deja al día (su marca pasa a ser mayor).
- **RF-008** Sin cambios en el documento final ni en Copy/Download; el texto
  del juez no se modifica.

## Decisiones tras la revisión

- **Caja vaciada:** si el valor nuevo es `''`, la marca pasa a **NULL** (no a
  `now`): una caja vacía no está desfasada ni desfasa a otras. Además la UI no
  avisa en una caja cuyo texto guardado está vacío.
- **Comparación:** `String(guardado ?? '') !== String(recibido ?? '')`, sin
  `trim`; un campo ausente del body no cuenta como cambio.
- **PUT genérico:** la fila se lee **antes** del UPDATE (404 antes de
  actualizar si no existe, solo en las tablas con `stampOnChange`); las
  columnas `*_at` no entran en `fields` (el cliente no puede escribirlas) y
  `stampOnChange` solo se pasa a `cases`. Los nombres de columna salen del
  código.
- **Ruta nueva:** hereda la autenticación global (`onRequest`), sin
  `requireAdmin`; `box` se valida contra una lista blanca y el nombre de
  columna sale del código.
- **Cliente:** las marcas de la respuesta del PUT se copian a `caseFull`
  **justo después** de `updateCase` (antes de partes y testigos, para que un
  fallo posterior no las pierda), sin tocar los textos en edición. "Mark as
  reviewed" se deshabilita durante la petición y muestra el error si falla.
- **Cadena al revisar:** revisar Conclusion sube su marca, y Decision pasa a
  avisar por Conclusion si esta es posterior: es la cadena funcionando.

## Límites aceptados

- **Citas registradas fuera de la marca:** dar de alta o baja una cita
  (`case_rule_citation`) no mueve `rules_applicable_at`; solo el texto de la
  caja guardado con Save.
- **Save desde una pestaña obsoleta:** `handleSaveAll` manda siempre las cinco
  cajas; una pestaña con un texto viejo que guarda marcará esa caja como
  cambiada. Proyecto de un solo usuario: se acepta.
- Falsos avisos: un cambio ortográfico en Facts Found avisa igual; se descarta
  con "Mark as reviewed". Quien redacta de forma no lineal verá avisos que
  descarta igual.
- Resolución de un segundo (`datetime('now')`): cambios en el mismo segundo
  cuentan como a la vez.
- Casos ya existentes no avisan hasta que se editan de nuevo.

## Criterios de aceptación (verificación en vivo, TEST-02, con limpieza)

1. Escribir y guardar Conclusion; después cambiar Facts Found y guardar:
   aviso en Conclusion (y Decision si tiene marca).
2. "Mark as reviewed" quita el aviso sin cambiar el texto.
3. Guardar sin cambios no activa avisos. Cambiar Facts y Conclusion en el
   mismo Save: sin aviso.
4. Caso antiguo sin marcas: sin aviso.
5. Cambiar Facts, guardar, "Mark as reviewed" en Conclusion: Conclusion deja de
   avisar y Decision (con marca) avisa por Conclusion; revisar Decision lo
   quita.
6. Limpieza: vaciar los textos y guardar deja las marcas a NULL y sin avisos.

# SPEC-028 — Validar referencias tecleadas en Rules Applicable

Fase F6, segundo trozo (`issue.md` ISS-010). Estado: v2 (tras `reviewer`: sin bloqueantes, 4 importantes y 5 menores recogidos).

## Problema

SPEC-022 garantiza que una cita **añadida con Add** existe en el corpus. Pero
la caja Rules Applicable es texto libre: el juez puede teclear "RRS 44.5" o
"SI 40" que no existen en lo cargado (errata, otra edición, SI no subida) y
nada avisa. Una referencia equivocada en una decisión es el fallo que D-004
quiere evitar.

## Alcance

Solo **avisar** (como SPEC-026: avisa, no bloquea ni edita). Sin IA ni red.
Reutiliza el índice de SPEC-022 y la extracción de referencias de SPEC-027
(`explicitRefs`, una sola definición).

Fuera: Facts Found, Conclusion y Decision (otros trozos si hace falta),
referencias con parte (`RRS Appendix B 44`, `SI Addendum E 2.14`: no las
extrae `explicitRefs`; se aceptan como límite), desfase entre cajas, IA.

## Requisitos

- **RF-001 Ruta** `POST /rules/check` con `{ case_id, text }` en
  `registerRuleSearchRoute`. `text` no string → 400; `case_id` ausente o
  inexistente → solo RRS y clase. `text` se recorta a 8000 caracteres.
  Respuesta `{ unresolved: string[] }`: las referencias de `explicitRefs(text)`
  (únicas, en orden de aparición, tal como están escritas) que **no** resuelven
  a ninguna sección elegible. Una referencia resuelve si
  `sectionsForCitation(parseCitation(ref), eventId)` devuelve alguna.
  Elegibilidad idéntica a `/rules/search` (NoR/SI solo del evento del caso).
  Reglas de la extracción (ajustes tras `reviewer`): una referencia que
  `parseCitation` no entiende se **ignora** (como en `suggestSections`); un
  número entero de 4 o más cifras sin punto (`RRS 2021`, `SI 2024`: años) se
  ignora; las referencias se deduplican por su forma canónica
  (`formatCitation`), no por el texto escrito, y se muestra la primera tal
  como se escribió.
- **RF-002 Sufijo** `parseCitation` admite sufijos `(a)`; `sectionsForCitation`
  los ignora (comprueba el número). "RRS 44.2(c)" resuelve si existe la 44.2;
  no se valida que exista el subapartado `(c)`.
- **RF-003 UI** En `RulesSuggestions`, si la caja tiene referencias sin
  resolver, un aviso `rules-warning` ("Not found in the loaded rules: RRS
  44.5, SI 40. Check them or load the document."). Se recalcula con
  debounce de 500 ms al cambiar el texto, al cambiar las citas registradas y al
  cambiar de caso (**no** depende de las citas registradas: añadir o quitar una
  cita no cambia qué referencias existen, y el Add ya cambia el texto); se
  descarta la respuesta vieja (`cancelled`). Con texto vacío, con un fallo de
  la llamada o al cambiar de caso se hace `setUnresolved([])` explícito (un
  fallo de red no es un aviso de regla y no queda un aviso viejo en pantalla).
  Durante el debounce el aviso puede corresponder a un texto ya cambiado: se
  acepta. Cargar o aceptar un documento de reglas se refleja al abrir de nuevo
  la pestaña (el componente se monta de nuevo), no en vivo.
- **RF-004** Mismo texto en la caja que en el aviso: se analiza `rulesApplicable`
  tal como está en pantalla (guardado o no). El fallback de la lista de citas
  no se analiza (ya viene del corpus).
- **RF-005** Sin cambios de esquema ni de formato de documento; el texto del
  juez no se modifica.
- **RF-007 Límites aceptados de la extracción** (misma `explicitRefs` que
  SPEC-027): no casan `RULE 14` / `NOR 1.9` en mayúsculas completas, `Rules 10`,
  listas (`RRS 10, 11 and 14` solo extrae la 10) ni rangos (`61.1-61.2` solo
  la primera); y solo se comprueban las referencias dentro de los primeros 8000
  caracteres de la caja. Un documento de evento sin clasificar (`doc_type`
  nulo) no resuelve NoR ni SI, y el aviso dice "load the document" aunque esté
  cargado: la pestaña Upload rules ya pide clasificarlo.
- **RF-006 Falsos positivos aceptados:** una referencia que el juez cite de
  otro documento (p. ej. "RRS 99" inexistente a propósito, "Rule 4" del
  reglamento de clase no cargado) se marcará; el aviso solo informa.

## Criterios de aceptación (verificación en vivo, TEST-02, sin guardar)

1. Teclear "RRS 18.2 and RRS 44.9" en la caja: aviso con `RRS 44.9`, no con 18.2.
2. Corregir a "RRS 44.2": el aviso desaparece sin recargar.
3. "SI 12" sin SI cargada para el evento: aviso; con SI cargada, no.
4. Caja vacía o sin referencias: sin aviso.
5. Otras pestañas y cajas sin cambios.

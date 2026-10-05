# Constitution — Scribe Helper

Fuente única de principios, límites no negociables y seguridad de este
proyecto. Visión general, arquitectura y comandos: `CLAUDE.md`. Log
completo de decisiones técnicas con alternativas y consecuencias:
`DECISIONS.md`.

## Propósito

Ayudar a un juez de comité de protestas de vela a **escribir** la
decisión que sigue a una audiencia de protesta: reutilizar lo que ya se
sabe del caso (evento, carrera, día, barcos, números de vela, partes,
representantes, testigos, miembros del jurado) en vez de reteclearlo, y
facilitar encontrar y citar correctamente las reglas aplicables.

**La herramienta no decide nada.** El humano decide; la herramienta
propone, rellena, busca y formatea.

## Principios

- **Offline primero, lo incierto al final.** Todo lo que funciona sin
  red y no puede fallar en silencio se construye antes que cualquier
  cosa que pueda equivocarse de forma convincente.
- **Preferir lo determinista sobre la IA** cuando ambos puedan resolver
  el mismo problema — más barato, más rápido, incapaz de alucinar.
- **Tres almacenes de material, nunca mezclados**: `rules/` es
  autoridad (lo único citable), `examples/` es estilo (nunca citado
  como autoridad), `phrases/` es redacción propia del usuario. Los
  adjuntos de caso (protest forms subidos) son un cuarto concepto,
  deliberadamente separado de estos tres: no son citables, no son
  muestra de estilo, no son redacción reutilizable — pertenecen a un
  solo caso. (`DECISIONS.md` D-007, D-027)
- **El material del evento prevalece sobre el material permanente.**
  Las instrucciones de regata (SIs) y sus enmiendas modifican el RRS;
  cualquier recuperación que toque una regla debe considerar si la capa
  de evento la cambió. (`DECISIONS.md` D-008)
- **Cada fase termina en algo usable** — ninguna fase deja la
  herramienta en un estado que no se pueda llevar a una regata.
- **El producto está enteramente en inglés** — interfaz, botones,
  menús, errores, código, nombres de campo, comentarios, mensajes de
  commit y la documentación del proyecto. Las conversaciones de trabajo
  entre el dueño y un asistente IA son en español, por conveniencia, no
  por requisito del producto.
- **Usar los términos definidos de las reglas de vela** (*keep clear*,
  *clear astern*, *mark-room*, *proper course*, *obstruction*, etc.)
  con su significado técnico exacto; una paráfrasis en Facts Found es
  un error, no una elección de estilo.
- **Las etiquetas del formulario son la autoridad**, con una sola
  corrección deliberada: la plantilla origen pone "Fact Founds"; el
  término correcto es **Facts Found**, y Scribe Helper usa ese.
- **Todo lo que no es IA funciona sin conexión** — formulario del caso,
  librería de frases, búsqueda en el corpus, botones de copiar. Las
  conexiones fallan en los eventos; la herramienta no debe hacerlo.
- **Mantener la capa de datos separable.** SQLite es la elección de hoy;
  pasar a Postgres debería ser trabajo de un día, no una reescritura.
- **La aplicación no asume que el usuario es el dueño.** Si hace falta
  autenticación es cuestión de configuración, no de reescribir la
  aplicación. (`DECISIONS.md` D-003, D-012)
- **Separar UX de lógica de programación — en el código y en el orden
  de trabajo.** Los componentes (`apps/web/src/components/*.tsx`) solo
  presentan y disparan acciones; cálculo, formato y lógica de negocio
  viven en helpers aparte (`format.ts` es el patrón ya existente). Al
  construir una pantalla nueva, la experiencia de usuario (flujo,
  textos, qué ve el usuario) se define primero, como parte de la spec,
  antes de comprometerse a un modelo de datos o un endpoint.
  (`DECISIONS.md` D-028)
- **Coherencia interna dentro de una pestaña.** (1) Si una pestaña
  presenta su información como formulario, toda la información de esa
  pestaña es formulario — nunca una mezcla de campos de formulario y
  cajas de texto libre/documento dentro de la misma pestaña. (2) Si
  una pestaña de redacción permite insertar sugerencias de una fuente
  dada (Phrases, AI suggestions, párrafo/líneas candidatas del protest
  form), esa misma fuente debe ofrecerse — aunque esté vacía — en las
  cuatro pestañas de redacción (Procedural Matters, Facts Found,
  Conclusion, Decision), nunca presente en tres y ausente en la
  cuarta. No aplica a las listas de referencia de solo lectura
  (`PartyReference.tsx`) — esas nunca insertan por diseño, no son
  sugerencias. (`DECISIONS.md` D-029)

## Límites no negociables

- **Nada se cita si no está en el corpus.** Ningún número de regla que
  no se pueda trazar a texto cargado en `rules/` se produce — ni por la
  IA, ni por una plantilla, ni por un fallback. (`DECISIONS.md` D-004)
- **Toda afirmación de regla muestra su fuente**, visible sin salir de
  la pantalla.
- **Una frase propia del usuario nunca se presenta como una regla.**
- **Cuando el sistema no está seguro, lo dice.** Sin relleno plausible
  — una sugerencia vacía es mejor que una confiada pero incorrecta.
  Aplica al panel de IA, al autocompletado en línea y a la conversión.
- **Nada se inserta sin una acción explícita del usuario.** Sin
  auto-aceptar, sin reemplazo silencioso de texto que el usuario
  escribió.
- **La conversión se revisa antes de contar como válida** — material
  importado no es usable hasta que el usuario ha visto el Markdown y lo
  ha aceptado. Excepción documentada: los adjuntos de caso (protest
  forms) no pasan por esta puerta de revisión — una mala conversión ahí
  no arriesga una cita incorrecta como sí lo haría en `rules/`.
  (`DECISIONS.md` D-027)
- **Sin OCR.** Los documentos escaneados los procesa el usuario antes
  de subirlos. (`DECISIONS.md` D-010)
- **Todo se guarda como Markdown.** PDF, Excel, Word y Markdown entran;
  `.md` es el único formato almacenado. El original siempre se conserva
  junto a su `.md`.
- **El `.md` nunca se edita a mano.** Para corregir una mala conversión
  se corrige el origen fuera del sistema y se vuelve a subir.
- **Avisar ante una conversión vacía.** Un resultado casi vacío es lo
  que parece un PDF escaneado — sin el aviso, un reglamento puede estar
  "cargado" y vacío justo cuando hace falta.
- **Material permanente y material de evento en directorios
  separados.** El material de evento se reemplaza en cada regata.
  (`DECISIONS.md` D-008)

## Seguridad y datos

- **La API key del modelo nunca llega al navegador.** Esa es la razón
  de existir del backend — toda llamada al modelo pasa por la API.
- **Toda configuración vía variables de entorno** — puerto, API key,
  rutas, timezone; nada hardcodeado.
- **`.env` nunca se commitea**; `.env.example` documenta los nombres de
  variable sin valores reales — si se rompe esta regla, la API key
  queda en el historial de Git para siempre, incluso tras borrarla del
  árbol de trabajo.
- **Todos los datos viven bajo `data/`** — base de datos, corpus,
  ejemplos, frases, originales. Un único directorio, que es también el
  volumen montado y la copia de seguridad completa.
- **Sin datos personales reales de competidores en ejemplos publicados
  con el proyecto.** Los ejemplos base son material publicado o
  anonimizado.
- **El material propio de un usuario es suyo** — si se extiende acceso
  a otras personas, `examples/own` y `phrases/` son por usuario.
- **Solo rutas relativas**, nunca una ruta de Windows ni una ruta
  absoluta en el código — el mismo proyecto debe correr sin cambios en
  el servidor Ubuntu.
- **El servidor escucha en `0.0.0.0`, nunca en `localhost`** — dentro
  de un contenedor, `localhost` es inalcanzable desde fuera.
- **La timezone viene de configuración, nunca del host.** Los
  contenedores por defecto usan UTC; las decisiones registran la hora
  en que se informó a las partes, y eso debe ser la hora del evento.
- Sesión de usuario: cookie firmada (no cifrada) con HMAC-SHA256 sobre
  `node:crypto`; el payload no contiene nada secreto, por eso basta con
  que el cliente no pueda falsificarla o alterarla. (`DECISIONS.md`
  D-026)

## Calidad

- **No hay suite de tests automatizados ni linter en el proyecto hoy.**
  El único chequeo automatizado es `tsc --noEmit` (`apps/web`) /
  `tsc -p tsconfig.json` (`apps/api`, vía `npm run build`). La
  verificación real es manual, en vivo, contra el entorno desplegado.
- **Debounce en cada llamada a modelo, y cancelar las superadas.**
  Cerrar cualquier completado abierto en cada pulsación antes de
  disparar uno nuevo — si no, cada tecla cuesta dinero.
- **Usar prompt caching para el corpus y el system prompt** cuando el
  volumen de uso lo justifique — el mayor ahorro posible en este patrón
  de uso (marcado como pregunta abierta en `DECISIONS.md`).
- **Verificar hechos del producto contra la documentación actual en el
  momento de implementar** — nombres de modelo, precios, licencias y
  comportamiento de API cambian.

## Quién decide

**El dueño del proyecto decide todo lo significativo.** Así ha sido en
la práctica documentada en `DECISIONS.md` — la gran mayoría de
decisiones importantes están marcadas explícitamente como *"user's
explicit call"*. No hay otro rol de decisión en este proyecto: es de un
único usuario. (`DECISIONS.md` D-003)

## Fuente completa de decisiones técnicas

`DECISIONS.md` (27 decisiones a fecha 2026-09-29: D-001 a D-027, más una
sección de preguntas abiertas) **no se absorbe aquí ni se borra nunca**.
Esta constitución recoge los principios y límites que esas decisiones
establecieron; el razonamiento completo — alternativas consideradas,
por qué se eligió cada una, consecuencias, follow-ups técnicos cuando
una decisión se revisó en producción — sigue viviendo solo en
`DECISIONS.md`. Toda decisión significativa futura sigue registrándose
ahí, nunca copiada o duplicada en este archivo.

## Cambios a esta constitución

**Append-only**, mismo patrón que `DECISIONS.md`: para cambiar un
principio o límite aquí descrito se añade una entrada nueva que lo
sustituye explícitamente — nunca se edita o se borra en silencio lo que
ya dice este archivo. Todo cambio significativo a esta constitución es,
en sí mismo, una decisión que debería quedar también registrada en
`DECISIONS.md` con sus alternativas y su razón.

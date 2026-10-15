# CLAUDE.md

Visión general operativa de este proyecto. Principios, límites no
negociables y seguridad (fuente única, no duplicada aquí):
`constitution.md`. Log completo de decisiones técnicas con alternativas
y consecuencias: `DECISIONS.md`.

## Proyecto

Scribe Helper: asistente de redacción para **decisiones de comité de
protestas de vela** (sailing race protest decisions). Ayuda a un juez a
escribir la decisión que sigue a una audiencia de protesta. La
herramienta **no decide nada** — el humano decide; la herramienta quita
tecleo, evita reintroducir datos ya conocidos, y facilita encontrar y
citar correctamente las reglas aplicables.

- **Usuario principal**: una sola persona, el dueño del proyecto — un
  juez que escribe decisiones reales en eventos reales.
- **Secundario, futuro**: acceso temporal para otros jueces (fase
  posterior, no v1).

Alcance v1 (dentro): decisiones de protesta solamente, entrada de datos
del caso (mismo formulario existente), librería de frases
(determinista, sin IA), corpus de reglas con citación trazable, panel
de borrador IA, autocompletado IA en línea, copiar-al-portapapeles por
caja.

Explícitamente fuera de v1: solicitudes de reparación (redress),
exportación a `.docx` (sustituida por copiar-pegar), edición manual del
Markdown convertido, OCR, cuentas/login/roles (añadido después en fase
5.5, ver `DECISIONS.md` D-026), escritura concurrente multiusuario.

### El documento de decisión

El formulario es la columna vertebral del modelo de datos, en tres
capas:

- **Estructura fija** (nunca cambia): Parties, Witness, Procedural
  Matters, Facts Found, Conclusion, Rules Applicable, Decision, Jury
  Members. Nota: la plantilla origen escribe "Fact Founds"; el término
  correcto es **Facts Found**.
- **Datos auto-rellenados** (nunca se teclean dos veces): número de
  caso, día, with case(s), carrera; iniciador y respondido (número de
  vela, nombre de barco); representado por, por cada parte; testigos
  con su rol; fecha y hora en que se informó a las partes; presidente
  del panel y miembros del jurado: elegidos por caso (`case_jury_member`),
  desde un pool de jueces que sí pertenece al evento (`jury_member`) —
  dos niveles, no uno; corregido de la redacción original que decía que
  el jurado pertenecía solo al evento (`DECISIONS.md` D-021).
- **Cajas escritas por el humano** — cinco, donde aplica asistencia de
  redacción (texto fantasma): Procedural Matters, Facts Found,
  Conclusion, Rules Applicable y Decision. **Cuatro de ellas**
  (Procedural Matters, Facts Found, Conclusion, Decision) usan además la
  librería de frases, la franja de propuestas y el menú "More" (buscar y
  explorar frases, ejemplos, guardar frase). **Rules Applicable es un
  híbrido** (`DECISIONS.md` D-032): una caja de texto (`rules_applicable`,
  se guarda con Save) junto a un **registro de citas** validado
  (`case_rule_citation`, alta y baja instantáneas, respaldado por el
  corpus). El documento sale del texto de la caja; si está vacía, de la
  lista de citas. Su texto fantasma nunca escribe números de regla, y no
  usa la librería de frases (la tabla `phrase` solo conoce las otras
  cuatro cajas).

### Los mecanismos de sugerencia

Son sistemas separados, no dos modos del mismo sistema. Además, las cuatro
cajas de frases (Procedural Matters, Facts Found, Conclusion, Decision)
tienen encima, al ancho del cuadro donde se escribe, una **franja de hasta
3 propuestas vivas** (`ProposalsStrip`, `DECISIONS.md` D-046, SPEC-034):
frases guardadas que encajan con lo escrito y las hearing notes (al instante,
en el navegador) y, a ~1,5 s de dejar de teclear, propuestas de la IA
validadas en el servidor (huecos de datos solo con valor citado y verificado;
redacción nueva solo en Procedural y Facts, frase por frase y anclada a las
fuentes; en Conclusion y Decision solo frases guardadas, sin frases de
resultado en Decision). Un clic inserta en el cursor sin reemplazar la
selección; nada se inserta solo y no se muestra de qué origen viene cada
propuesta. Buscar y explorar frases, "Suggest from examples" y "Save as
phrase" (la selección o la caja entera) viven en el menú "More". En Rules
Applicable no hay propuestas de IA: encima del cuadro está la bandeja
`RulesSuggestions` (citas registradas, alta manual y buscador del corpus) y los
avisos bajo la cabecera.

| | Autocompletado en línea | Panel de borrador alternativo |
|---|---|---|
| Dónde | En el editor, como ghost text | Un panel aparte (`AIDraftPanel`, sin montar desde SPEC-020; D-030) |
| Qué | Termina la frase que se está escribiendo | Una versión alternativa completa |
| Aceptar | Tab | Aceptar, editar o ignorar |
| Fuente | Librería de frases (determinista) + IA | IA |

La **librería de frases es la mitad importante**: coincidencia exacta
de prefijo contra frases guardadas por el usuario — instantánea,
gratis, offline, incapaz de alucinar. No se construye en una pantalla
aparte: el usuario **selecciona texto mientras redacta y lo guarda como
frase**; la librería crece con el uso.

Dos tipos de frase: **fija** (se inserta tal cual) y **con huecos**
(`DECISIONS.md` D-036, D-042). Un hueco es un `[corchete]` balanceado y cada
corchete es un hueco propio, también los pegados (`[injury] [serious damage]`:
son alternativas que el escribano borra o deja). Una frase de la librería se
inserta **en el cursor** y abre una sesión: el primer hueco queda
seleccionado, Tab / Shift+Tab los recorren y Escape la cierra. `X` e `Y`
(sueltas o `[X]`/`[Y]`) son etiquetas de parte, no huecos: una barra bajo el
cuadro ofrece los barcos del caso y un clic las sustituye. El texto fantasma
propone primero el resto de una frase de la librería por prefijo, después el
número de vela y la IA. Los huecos **de datos** (`[##]`, `[race ##]`, `[date]`,
`[time]`) pueden rellenarse con IA (botón "Fill data gaps with AI"): propone un
valor con su fuente y una cita literal, que el servidor verifica contra la
fuente; el escribano acepta cada valor. La IA nunca elige entre alternativas.

### Ayudas a la coherencia de la cadena

La decisión es una cadena: Hearing notes → Facts Found → Rules Applicable →
Conclusion → Decision. Estas ayudas **avisan, no bloquean ni editan** el texto
del juez:

- **Huecos sin rellenar** (D-037): cada caja avisa si aún tiene `[huecos]` o
  `X`/`Y`; Review los resume y Download pide confirmación.
- **Desfase entre cajas** (D-040): el servidor guarda cuándo cambió cada caja
  de la cadena (`facts_found_at`, `rules_applicable_at`, `conclusion_at`,
  `decision_at`); una caja avisa si una anterior cambió después, con "Mark as
  reviewed".
- **Referencias tecleadas** (D-039): Rules Applicable avisa de las citas del
  texto (`RRS 44.9`) que no existen en el corpus cargado.
- **Reglas sugeridas desde Facts Found** (D-038): búsqueda de texto completo
  determinista; Add reutiliza la alta validada de SPEC-022.
- **Fantasma con contexto** (D-041): el texto fantasma de IA lee, solo como
  datos, las cajas anteriores de la cadena; en Rules Applicable sin dígitos.

### Los tres almacenes de material, en detalle

- **`rules/` — autoridad.** Lo único citable. Dos grupos (`DECISIONS.md`
  D-045): **permanentes** (RRS, sus apéndices y las enmiendas al reglamento;
  estables por cuadrienio, globales) y **de evento** (reglas de clase, NoR,
  SIs y las enmiendas de cualquiera de ellas; propias de una regata, las
  enmiendas pueden cambiar durante el evento, a veces en el mismo día).
  Una enmienda se cita con el prefijo del documento que enmienda (`CR`,
  `NoR`, `SI`). Precedencia: RRS, reglas de clase, NoR y SIs, enmiendas;
  las de evento modifican el RRS. Aparte, Cases, Calls y apelaciones
  nacionales (interpretativo, no prescriptivo).
- **`examples/` — estilo.** Decisiones previas, usadas como muestra de
  estilo para la IA y como archivo buscable. **Nunca citado como
  autoridad.** Dos conjuntos: **base** (viene con el proyecto, igual
  para todos, no editable) y **own** (subido por el usuario, editable y
  borrable).
- **`phrases/` — redacción propia del usuario.** Fragmentos reutilizables
  que el usuario escribe, etiquetados por caja. Nunca se presenta como
  regla.
- **Adjuntos de caso — un cuarto concepto, separado.** Formularios de
  protesta subidos por caso (pestaña "0. Protest Form(s)", antes de "1.
  General & Parties"), varios por caso. Convertidos a Markdown al subir
  para menor tamaño y uso posterior (`DECISIONS.md` D-027), pero **no**
  es un cuarto almacén de material: no citable, no muestra de estilo,
  no redacción reutilizable, no indexado para búsqueda. Pertenece a un
  solo caso. Sin puerta de revisión aceptar/rechazar, a diferencia de
  `rules/`/`examples/`.

### Ingestión de archivos

Los archivos entran como **PDF, Excel, Word o Markdown**. Siempre se
guardan como `.md` — un formato interno, una cosa que lee la IA, una
cosa que indexa la búsqueda.

Flujo: 1) el usuario sube un archivo origen → 2) el sistema lo
convierte a Markdown, una vez → 3) **el usuario revisa el Markdown y lo
acepta o lo rechaza** → 4) aceptar conserva `.md` + original; rechazar
borra todo, sin huérfanos.

Reglas de este flujo: el original siempre se conserva junto al `.md`;
la revisión importa más en `rules/` (una mala conversión ahí produce
una cita confiada pero incorrecta); el `.md` nunca se edita a mano
—para corregir, se arregla el origen fuera del sistema y se vuelve a
subir—; borrar el `.md` lo regenera desde el original y vuelve a pasar
por revisión; una conversión vacía o casi vacía avisa; sin OCR.

### Arquitectura de un vistazo

TypeScript en todo (frontend y backend). **React + Vite** en el
frontend, **CodeMirror 6** como editor. **Node + Fastify** en la API
— existe para que la API key del modelo nunca viva en el navegador.
**SQLite** para los datos (un fichero, dentro de `data/`), **SQLite
FTS5** para la búsqueda en el corpus (sin base de datos vectorial en
v1: el RRS está numerado y estructurado, así que se parsea por número
de regla y se busca por palabra clave — más preciso y más barato que
embeddings a este tamaño de corpus). **Docker**, stack multi-contenedor,
corriendo en el servidor doméstico del dueño (Ubuntu, CasaOS,
Portainer). Configuración vía `.env`. Todos los datos bajo `data/`, que
es a la vez el volumen montado y la copia de seguridad completa.

Razonamiento completo de cada elección en `DECISIONS.md`.

```
scribe_helper/
  .env                  # nunca se commitea
  .env.example          # se commitea, sin valores reales
  .stignore             # exclusiones de Syncthing
  docker-compose.yml
  CLAUDE.md
  constitution.md
  DECISIONS.md
  apps/
    web/                # React + CodeMirror
    api/                # Node + Fastify
  data/                 # el volumen, y la copia de seguridad
    rules/
      rrs/              # permanente
      class/            # heredado; migrado al evento al arrancar (D-045)
      event/            # reglas de clase, NoR, SIs y enmiendas, por regata
    examples/
      base/             # viene con el proyecto
      own/              # subido por el usuario
    phrases/
    case_attachments/   # protest forms, por caso, no es un almacén de material
      originals/
    originals/          # archivos origen, junto a su .md
    db/                 # excluido de la sincronización de archivos
```

### Fases

Cada fase termina en algo usable. Nada que funcione offline se pospone
detrás de algo que necesita red.

| Fase | Contenido | IA |
|---|---|---|
| 0 | Documentos base del proyecto, repo, estructura de carpetas | no |
| 1 | Modelo de datos, formulario de caso, copiar por caja, copiar todo, guardado local | no |
| 2 | Librería de frases, autocompletado determinista, guardar-como-frase | no |
| 3 | Ingestión del corpus, conversión, revisión, búsqueda FTS, selector de reglas | no |
| 4 | Panel de borrador alternativo, con validación de citas | sí |
| 5 | Autocompletado IA en línea | sí |
| 5.5 | Despliegue al servidor doméstico, volumen, contraseña | — |
| 5.6 | Asistencia IA en el formulario: extracción de adjuntos de caso, desglose de Facts Found, panel de sugerencias lateral | sí |
| 5.7 | Replanteo (2026-10, cerrado): lista única de sugerencias (SPEC-020), Rules Applicable como pestaña y caja de redacción propias (SPEC-021, SPEC-023), menú "Jury" quitado (D-031), citas desde el corpus (SPEC-022), frases con huecos (SPEC-025), avisos de huecos sin rellenar, referencias tecleadas y desfase entre cajas (SPEC-026, 028, 029), reglas sugeridas desde Facts Found (SPEC-027), fantasma que ve las cajas anteriores (SPEC-030) y huecos de datos con IA (SPEC-031). Fases F1-F6 hechas — ver `issue.md` | sí |
| 5.8 | Propuestas vivas (2026-10, cerrado, SPEC-034, D-046): franja de hasta 3 propuestas sobre el cuadro, menú "More", sin columna lateral, Rules Applicable con bandeja y avisos bajo la cabecera, sin "Process" de hearing notes | sí |
| 6 | Compartir, solicitudes de reparación (redress) | — |

Principio de orden: todo lo que funciona offline y no puede fallar en
silencio va primero; todo lo que puede equivocarse de forma convincente
va al final. Tras la Fase 2 la herramienta ya ahorra tiempo real en una
regata, sin IA y sin red.

### Glosario

| Término | Significado |
|---|---|
| RRS | Racing Rules of Sailing |
| NoR | Notice of Race |
| SI | Sailing Instructions |
| Protest | Reclamación de que un barco rompió una regla |
| Redress | Solicitud de corrección de puntuación; fuera de alcance en v1 |
| Facts Found | Los hechos probados, escritos por el jurado |
| Boilerplate | Texto estándar pre-escrito; llamado `phrases` en este proyecto |
| Corpus | El material citable en `rules/` |
| Ghost text | Sugerencia en línea en gris, se acepta con Tab |

## Método de trabajo

- **Spec-Driven Development**: cada unidad de trabajo tiene
  `specs/SPEC-NNN-<slug>.md` (requisitos), `SPEC-NNN-plan.md` y
  `SPEC-NNN-tasks.md`; el subagente `reviewer` revisa la spec antes de
  construir. Los problemas abiertos y el plan por fases viven en
  `issue.md`.
- **Pestañas del caso**: 0 Protest Form(s), 1 General, 2 Parties &
  Witness, 3 Procedural Matters, 4 Facts Found, 5 Conclusion, 6 Rules
  Applicable, 7 Decision, 8 Review. Los jueces del caso se eligen al
  final de Review (`JurySlots`); no hay entrada "Jury" en el menú
  superior.
- **Toda decisión significativa se registra en `DECISIONS.md`**, con las
  alternativas que estaban sobre la mesa y la razón elegida. Es
  "append only": para cambiar una decisión se añade una entrada nueva
  que la sustituye, nunca se edita el historial.
- Principios de fondo (offline primero, preferir lo determinista,
  cada fase deja algo usable, verificar hechos al implementar): ver
  `constitution.md` → Principios y Calidad.

## Reglas no negociables

Lista completa, con razones, en `constitution.md` → Principios,
Límites no negociables y Seguridad y datos. No se duplica aquí. Cada
regla existe porque romperla causa un fallo concreto; si hace falta
romper una, no se rompe en silencio: se añade una entrada a
`DECISIONS.md` explicando por qué.

## Seguridad

Ver `constitution.md` → Seguridad y datos (fuente única: API key,
`.env`, datos personales, material por usuario, sesión/autenticación).

## Comandos

Confirmado: ni `apps/api/package.json` ni `apps/web/package.json`
declaran un script `test` o `lint` (ver `constitution.md` → Calidad
para el principio detrás de esto).

- **`apps/api`**:
  - `npm run dev` — arranque en desarrollo (`tsx watch src/server.ts`)
  - `npm run build` — compila TypeScript (`tsc -p tsconfig.json`)
  - `npm run start` — arranca el build compilado (`node dist/server.js`)
  - `npm run migrate` — migraciones de base de datos (`tsx src/db/migrate.ts`)
- **`apps/web`**:
  - `npm run dev` — arranque en desarrollo (`vite`)
  - `npm run build` — build de producción (`vite build`)
  - `npm run typecheck` — único chequeo automatizado existente (`tsc --noEmit`)
  - `npm run preview` — sirve el build de producción localmente

Despliegue: no se ejecuta en esta máquina. El dueño despliega vía
Portainer/GitOps desde
`https://github.com/LuisoFerrandiz/ScribeHelper.git` — hacer `push` a
`master` y pulsar "Pull and redeploy" en el stack de Portainer.

## Definición de terminado

Una tarea se considera terminada cuando:

1. `npm run typecheck` pasa limpio (en `apps/web`; en `apps/api`,
   `npm run build` ya que no tiene script `typecheck` propio).
2. Se ha verificado en vivo contra el entorno desplegado
   (`http://192.168.1.105:8086/`), no solo localmente — este proyecto no
   tiene suite de tests que sustituya esa verificación manual.
3. El cambio está commiteado y pusheado a `master`
   (`origin/master` en `https://github.com/LuisoFerrandiz/ScribeHelper.git`).
4. El dueño ha pulsado "Pull and redeploy" en Portainer y se ha
   reconfirmado el comportamiento en producción tras el redeploy.

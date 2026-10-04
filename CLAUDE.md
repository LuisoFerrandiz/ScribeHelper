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
- **Cajas escritas por el humano** — solo cuatro, las únicas donde
  aplica asistencia de redacción: Procedural Matters, Facts Found,
  Conclusion, Decision. **Rules Applicable es un híbrido**: lo escribe
  el humano, pero se nutre de una lista cerrada y validada respaldada
  por el corpus.

### Los dos mecanismos de sugerencia

Son sistemas separados, no dos modos del mismo sistema.

| | Autocompletado en línea | Panel de borrador alternativo |
|---|---|---|
| Dónde | En el editor, como ghost text | Un panel aparte |
| Qué | Termina la frase que se está escribiendo | Una versión alternativa completa |
| Aceptar | Tab | Aceptar, editar o ignorar |
| Fuente | Librería de frases (determinista) + IA | IA |

La **librería de frases es la mitad importante**: coincidencia exacta
de prefijo contra frases guardadas por el usuario — instantánea,
gratis, offline, incapaz de alucinar. No se construye en una pantalla
aparte: el usuario **selecciona texto mientras redacta y lo guarda como
frase**; la librería crece con el uso.

Dos tipos de frase: **fija** (se inserta tal cual) y **con huecos** (la
aplicación debe saber dónde colocar el cursor).

### Los tres almacenes de material, en detalle

- **`rules/` — autoridad.** Lo único citable. Capas con precedencia: 1)
  RRS (estable por cuadrienio, global), 2) reglas de clase (estable por
  temporada), 3) NoR y SIs (específicas del evento), 4) enmiendas a las
  SIs (cambian durante el evento, a veces en el mismo día), 5) Cases,
  Calls, apelaciones nacionales (interpretativo, no prescriptivo). Las
  capas 3 y 4 modifican la capa 1.
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
      class/            # por temporada
      event/            # se reemplaza en cada regata
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
| 6 | Compartir, solicitudes de reparación (redress) | — |

Principio de orden: todo lo que funciona offline y no puede fallar en
silencio va primero; todo lo que puede equivocarse de forma convincente
va al final. Tras la Fase 2 la herramienta ya ahorra tiempo real en una
regata, sin IA y sin red.

**Nota de estado (auditoría 2026-10-04):** esta tabla no refleja
trabajo ya desplegado después de la Fase 5.5 (extracción IA de
adjuntos de caso, desglose de Facts Found, panel de sugerencias
lateral) — ninguna de esas tres cosas tiene fase propia documentada.
Pendiente de decisión del usuario sobre cómo documentarlo.

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

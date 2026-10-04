# SPEC-001 — Pantalla de entrada

Estado: draft (sin construir todavía)

Relacionado: `CLAUDE.md` (visión general, arquitectura), `constitution.md`
(principios no negociables), `DECISIONS.md` D-018 (find-or-create
regatta/case, superseded en la práctica por SPEC-002 para el flujo de
creación), D-019 (Case screen como entrada de la app), D-026
(login/sesión/roles). `SPEC-002-nuevo-caso.md` define el popup "New
case" que RF-004 de aquí abajo dispara — no se duplica su diseño en
este documento.

## Intención

La pantalla con la que arranca la app tras logearse. En vez del
selector actual de texto+datalist (`CaseSelector.tsx`), un listado
tabular de todos los casos existentes — para encontrar un caso de un
vistazo sin escribir nada — más acceso rápido a crear uno nuevo, y una
cabecera con el menú de administración (solo visible para el manager)
y el control de sesión del usuario.

## Alcance

**Dentro:**
- Listado de casos: Regatta, Case, Initiator, Respondent, Decision
  (estado).
- Click en una fila abre ese caso.
- Crear regata/caso nuevo desde esta misma pantalla.
- Menú superior (Upload examples, Upload rules, Users) visible
  únicamente para el manager (rol `admin`).
- Botón de usuario arriba a la derecha, con submenú de una sola
  entrada: Log out.
- Reemplaza `CaseSelector.tsx` como pantalla de entrada.

**Fuera (de esta spec):**
- Cambiar contraseña desde el submenú del usuario (ya existe el
  endpoint `POST /auth/change-password`, D-026, pero no se expone
  aquí).
- Ordenación, filtro o búsqueda dentro del listado — ver `[POR
  DEFINIR]`.
- Paginación — ver `[POR DEFINIR]`.
- Gestión de roles o de más de un admin — sigue como en D-026 (un
  único admin).

## Usuarios y contexto

Reutiliza el modelo de sesión ya existente (D-026): `SessionUser {id,
username, role}`, `role` es `'admin' | 'user'`. El **manager** de esta
spec es el usuario con `role === 'admin'` — hoy un único admin,
sembrado de `ADMIN_USERNAME`/`ADMIN_PASSWORD`, username `luiso`. No es
un rol nuevo.

## Requisitos

**RF-001 — Listado de casos como pantalla de entrada**
Dado un usuario logeado, cuando entra en la pestaña "Case" (pantalla
por defecto tras login), entonces ve una tabla con una fila por caso
existente y las columnas: Regatta, Case, Initiator, Respondent,
Decision.

**RF-002 — Columna Decision como estado**
Dado un caso en el listado, cuando su caja Decision tiene texto no
vacío, entonces la columna Decision muestra "Decided"; cuando está
vacía, muestra "Pending".

**RF-003 — Abrir un caso desde el listado**
Dado el listado visible, cuando el usuario hace click en una fila,
entonces la app navega al formulario de ese caso (pestaña activa por
defecto, con ese `case_id` cargado).

**RF-004 — Crear un caso desde la pantalla de entrada**
Dado el listado visible, cuando el usuario hace click en el botón "New
case", entonces se abre el popup definido en `SPEC-002-nuevo-caso.md`
(regatta + case number, con su propia validación y navegación al
terminar). Diseño completo de ese popup: `SPEC-002-nuevo-caso.md`, no
repetido aquí.

**RF-005 — Menú de administración, solo para el manager**
Dado un usuario logeado con `role !== 'admin'`, cuando mira la barra
de navegación superior, entonces NO ve las entradas "Upload examples",
"Upload rules" ni "Users". Dado un usuario logeado con `role ===
'admin'`, entonces SÍ ve las tres. (Cambia el comportamiento actual:
hoy "Upload examples"/"Upload rules" son visibles para cualquier
usuario logeado, solo "Users" es admin-only.)

**RF-006 — Botón de usuario con submenú**
Dado un usuario logeado, cuando mira la esquina superior derecha,
entonces ve un botón con su `username`. Cuando hace click en ese
botón, entonces se despliega un submenú con una única opción "Log
out". Cuando selecciona "Log out", entonces se cierra la sesión
(`POST /auth/logout`) y la app vuelve a la pantalla de login.

**RF-007 — Idioma**
Todo el texto de esta pantalla (menú, cabeceras de columna, botones,
mensajes) está en inglés (`constitution.md` → Principios, "El producto
está enteramente en inglés").

## Seguridad y privacidad

- No cambia el mecanismo de autenticación (D-026): sigue siendo cookie
  de sesión firmada, `httpOnly`.
- RF-005 es un gate solo de interfaz (ocultar botones). Las rutas
  backend correspondientes (`POST /resources`, `/users/*`) ya exigen
  rol admin server-side según D-026 — **verificar en el build que
  sigue siendo así**, ocultar el botón en el frontend nunca sustituye
  el control de acceso del backend.

## Restricciones

- No hay tests automatizados ni linter en el proyecto (`constitution.md`
  → Calidad) — verificación manual en vivo, como el resto del
  proyecto.
- `AuthError`/401 ya redirige a `Login` (`App.tsx`) — este
  comportamiento no cambia.

## Decisiones técnicas

- Reutiliza `SessionUser.role` tal cual existe hoy — ningún cambio de
  esquema de sesión necesario.
- `CaseSelector.tsx` se reemplaza por el nuevo componente de listado;
  `EventList.tsx`/`EventDetail.tsx` ya no existen (D-019), no hay nada
  que coordinar con ellos.
- Fuente de datos del listado: sin decidir todavía si se amplía
  `GET /cases` para traer parties/decision inline, o si el frontend
  llama `GET /cases/:id/full` por cada fila — ver `[POR DEFINIR]`.

## Tareas

`[POR DEFINIR]` — se listan al pasar esta spec a build, no antes.

## [POR DEFINIR]

- ¿El listado se ordena por algo (fecha, regata, número de caso), o
  en el orden que devuelva la base de datos?
- ¿Hace falta buscar/filtrar dentro del listado, o basta con scroll?
  (Importa si la cantidad de casos por regata crece mucho.)
- ¿Paginación si hay muchos casos, o se carga todo de una vez?
- Endpoint exacto para traer Initiator/Respondent/Decision por caso en
  una sola llamada — hoy `GET /cases` no trae `parties`, solo
  `GET /cases/:id/full` (uno por caso) los tiene. ¿Se amplía el
  backend antes de construir esto, o se acepta N llamadas?

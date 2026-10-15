# Futuras specs (ideas aparcadas)

Ideas que **no** se van a construir ahora. Aquí solo se guardan con su
viabilidad y sus riesgos para no perderlas. Una idea pasa a ser spec real
(`specs/SPEC-NNN-*.md`, con revisión del `reviewer`) solo cuando el dueño lo
decida. Nada de este archivo está aprobado ni planificado.

Formato por idea: qué es, para qué, viabilidad, qué haría falta, riesgos,
preguntas abiertas.

---

## FUT-001 — Micrófono abierto durante la audiencia

**Estado:** idea, sin fecha. Registrada el 2026-10-15.

**Qué es.** Dejar el micrófono abierto durante la audiencia de protesta para
que la IA obtenga información directamente de lo que se dice (declaraciones de
las partes y testigos), en lugar de depender solo de las hearing notes que
teclea el juez.

**Para qué.**
- Alimentar las hearing notes con una transcripción, de la que ya sabemos
  extraer Procedural Matters, Facts Found, etc. (`extractNotes.ts`, SPEC-017).
- Ahorrar tecleo al juez durante la audiencia y no perder detalles.

**Viabilidad: sí, técnicamente, con condiciones.** No es un cambio pequeño.

1. **Captura en el navegador.** `getUserMedia` / `MediaRecorder` solo funcionan
   en contexto seguro: **HTTPS** o `localhost`. La app corre hoy en
   `http://192.168.1.105:8086/` (HTTP en red local): el navegador **bloquearía
   el micrófono**. Haría falta HTTPS (proxy inverso con certificado, o
   certificado propio instalado en el dispositivo del juez). Es el primer
   requisito, y toca despliegue (Portainer, compose).
2. **Transcripción (voz a texto).** La API de Claude que usamos trabaja con
   texto; **no es un servicio de voz a texto**. Habría que añadir otro
   componente: un modelo de voz a texto en el propio servidor (p. ej. Whisper
   en contenedor, sin enviar audio fuera, pero con coste de CPU/RAM en un
   servidor doméstico) o un servicio en la nube (más cómodo y preciso, pero el
   audio sale de casa). Es una decisión de arquitectura nueva (D-0NN).
3. **Del texto a la app.** La transcripción sería un texto más, tratado como
   "hearing notes automáticas". Reutiliza la extracción existente. La IA no
   decide nada: propone, el juez revisa (límite no negociable).
4. **Dispositivo y entorno.** Una audiencia real puede ser en una sala con
   varios hablantes, solapamientos, ruido de viento/motores, varios idiomas y
   acentos. La calidad de la transcripción y la separación de hablantes
   (quién dijo qué) es el punto débil: sin diarización fiable, atribuir un
   hecho a una parte puede ser incorrecto, y eso importa en una decisión.

**Qué haría falta (a grandes rasgos).**
- HTTPS en el despliegue.
- Un servicio de transcripción (local o nube) y un endpoint que reciba audio
  en trozos o al final, con tope de tamaño y duración.
- Una pantalla de "audiencia en curso" con grabar/pausar, indicador visible de
  que se está grabando, y revisión/edición de la transcripción antes de usarla.
- Decidir si se **guarda el audio**, solo la transcripción, o ninguno (por
  defecto: borrar el audio tras transcribir).
- Marcado de la transcripción como "no verificada": nunca se cita como
  autoridad ni como hecho probado.

**Riesgos.**
- **Privacidad y legalidad:** se graba la voz de personas reales (partes,
  testigos, menores en regatas juveniles). Exige aviso y consentimiento
  explícito, y revisar la normativa de protección de datos aplicable y el
  reglamento del evento. Encaja con la regla de seguridad de datos de
  `constitution.md`; casi seguro pide una enmienda.
- **Modo sin red:** "offline primero" (principio de la constitución). La
  transcripción local lo respeta; la de nube no.
- **Errores que convencen:** una transcripción equivocada que parece
  verosímil acaba en Facts Found. Mitigación: el juez revisa; nada se inserta
  solo; las frases de la transcripción llevan etiqueta de origen.
- **Coste y rendimiento** en el servidor doméstico si la transcripción es
  local.
- **Datos sensibles en `data/`:** `data/` se sincroniza (Syncthing) y es
  público (ISS-001); un audio o transcripción real no debe acabar ahí sin
  decidir antes dónde viven.

**Preguntas abiertas.**
- ¿Transcripción local (privacidad, más lenta) o en la nube (precisión)?
- ¿Se guarda el audio o solo el texto?
- ¿La audiencia es presencial con un solo micrófono, o también en remoto?
- ¿Idiomas habituales de las audiencias?
- ¿Transcribir en vivo (texto que va apareciendo) o al final de la audiencia?
  Al final es mucho más sencillo y barato.

**Alternativa barata para empezar (si algún día se quiere probar).** Sin
HTTPS ni servidor de voz: el juez graba con el móvil, transcribe con la
herramienta que ya use, y **pega el texto** en la caja de hearing notes. La app
ya extrae lo útil de ahí. Esto valida si la transcripción aporta valor antes
de construir nada.

### Estudio de viabilidad (2026-10-15, subagente)

**Veredicto.** Integrado en la app: viable con condiciones, pero hoy no
compensa. Herramienta aparte (grabar y transcribir fuera, pegar el texto en
hearing notes): viable y barato; es el camino para validar primero.

| | Integrado | Aparte |
|---|---|---|
| Pros | Un solo flujo; reutiliza `extractFromNotes`; transcripción marcable como "no verificada"; audio borrable tras transcribir | Cero cambios en app, despliegue y constitución; sin HTTPS; motor intercambiable; el audio no pasa por `data/` (público y sincronizado, ISS-001) |
| Contras | HTTPS obligatorio; contenedor de voz; endpoint de audio; pantalla de grabación; enmienda de constitución y D-0NN; más datos personales | Fricción manual (grabar, transcribir, pegar); sin marca de origen ni control de borrado dentro de la app |

Hechos verificados:
- `getUserMedia` exige contexto seguro (HTTPS o `localhost`). En
  `http://192.168.x.x` `navigator.mediaDevices` no existe: no se podría grabar.
  HTTPS en casa: proxy inverso (Caddy con CA interna, hay que instalar su raíz
  en cada dispositivo; o dominio propio con certificado DNS-01). CasaOS usa el
  puerto 80 y puede chocar. Esta parte de dominio/DNS-01 no se comprobó.
- La API de Claude no transcribe audio (la lista de funciones no incluye audio).
  Haría falta otro motor.
- faster-whisper no incluye diarización (quién habla): hay que añadir WhisperX
  o pyannote. Medido solo con el modelo small: 13 min de audio en 1 min 42 s
  con 1,5 GB de RAM (CPU i7 de 8 hilos). Para modelos grandes en una CPU
  doméstica no hay cifras; habría que medirlo en el servidor.
- Calidad: error de palabras ~2-3 % en inglés limpio, 8-12 % en condiciones
  reales, más de 20 % con acento o telefonía (fuentes secundarias, poco
  fiables). Whisper inventa texto verosímil sobre silencio (hace falta
  detector de voz previo). Con voces solapadas la diarización se degrada.

Esfuerzo: aparte = pequeño (horas). Integrado, transcribiendo al final =
medio. Integrado en vivo con diarización fiable = grande.

Riesgo que más pesa: privacidad (voz de personas identificables, también
menores): aviso, consentimiento, base legal y retención. Segundo: atribuir un
hecho a la parte equivocada sin diarización fiable.

**Recomendación.** No construir nada en la app todavía. Primer paso barato, en
una audiencia real y con consentimiento: grabar con el móvil, transcribir con
una herramienta ya disponible (o faster-whisper en el portátil), pegar el texto
en hearing notes y ver si `extractFromNotes` lo aprovecha, sin fiarse de la
atribución de hablante. Medir errores y tiempo ahorrado. Si merece la pena, el
siguiente paso integrado sería **subir un archivo de audio y transcribirlo al
final**: no necesita HTTPS (se sube un archivo, no se usa el micrófono del
navegador) y reutiliza el patrón de adjuntos. Grabar en vivo, que sí exige
HTTPS, solo si lo anterior funciona.

**Preguntas que solo el dueño puede responder.** Idiomas y acentos habituales,
y si la sala es presencial con un micrófono o remota; si el audio puede salir
de casa (nube) o debe ser local; si el servidor tiene GPU y cuánta CPU/RAM
libre; si hay menores y reglas de consentimiento, y quién avisa a las partes;
si basta transcribir al terminar o hace falta texto en vivo; si se guarda el
audio o solo el texto; cuánto tiempo ahorraría frente al riesgo de fiarse de
una transcripción errónea.

### Herramientas y MCP que podrían ayudar (2026-10-15, subagente)

Conclusión: ningún MCP resuelve el problema solo. La diarización (quién habla)
sigue siendo lo difícil. Marcas: [V] verificado con fuente, [S] suposición.

- **El MCP `markitdown` de este entorno no sirve** [V]: para audio llama a
  Google Web Speech (nube), sin motor local, sin diarización, y solo lee
  wav/mp3. No usarlo con audio de audiencias.
- **MCP de Whisper local** (BigUncle/Fast-Whisper-MCP-Server, jochiang/voice-mcp,
  ZahiriNatZuke/whisper-transcribe-mcp): transcriben en el PC con
  faster-whisper. Sirven para uso desde Claude Code, no para integrarlos en
  la app. Poco contrastados [S].
- **Servidores para integrar en el stack (futuro):**
  - `hwdsl2/docker-whisper`: faster-whisper con diarización opcional
    (sherpa-onnx + pyannote segmentation), modo offline, CPU. El más cercano a
    "subir audio, transcribir y etiquetar hablantes". Proyecto pequeño;
    velocidad en CPU y calidad en español sin comprobar. No admite diarización
    en streaming [V].
  - `Speaches` (faster-whisper-server): API compatible con OpenAI, streaming,
    Docker CPU/GPU; sin diarización [V].
  - WhisperX / pyannote-audio: diarización local, más trabajo (Python) y exigen
    token de Hugging Face para descargar los modelos [V]; BSD-2 / MIT.
- **Apps para el camino "aparte" hoy:** iOS: Whisper Notes, TranscriAI (en el
  dispositivo, etiquetas de hablante, quizá de pago). Windows: Buzz (Whisper
  sin conexión, sin etiquetas de hablante). Android, MacWhisper y Otter: no
  comprobados.
- **HTTPS en la red local:** Caddy con `tls internal` (hay que instalar su CA
  raíz en cada dispositivo) o certificados de Tailscale (`*.ts.net`) [V].
  Nginx Proxy Manager y túneles de Cloudflare sin verificar (un túnel pasaría
  el audio por un tercero [S]).
- **Subir un archivo evita el problema de HTTPS** [S]: un
  `<input type="file" accept="audio/*">` no exige contexto seguro, al
  contrario que `getUserMedia`.

**Orden recomendado.** (a) Hoy, camino aparte: grabar con el móvil, transcribir
en el dispositivo y pegar en hearing notes. (b) Después, "subir audio y
transcribir al final" con `docker-whisper` o `Speaches` junto a la API, tope de
tamaño como los adjuntos, resultado como hearing notes (decisión nueva en
DECISIONS). Probar antes con audio real en español e inglés mezclados: velocidad
en la CPU del servidor, calidad del español y fiabilidad de la diarización en
sala quedan sin comprobar. (c) En vivo, solo después: pide HTTPS, streaming y
diarización.

### Estudio de Deepgram como motor (2026-10-15, subagente)

**Veredicto.** Encaja con condiciones. Bien para "subir audio y transcribir al
final"; el streaming en vivo no es urgente y exige HTTPS. **No encaja con
"offline primero"**: haría falta enmienda a `constitution.md` y una entrada
nueva en `DECISIONS.md`. Fuente: documentación oficial de Deepgram, consultada
el 2026-10-15; [V] verificado, [S] suposición.

| Punto | Dato | |
|---|---|---|
| Modelo | Nova-3, indicado para reuniones, varios hablantes, ruido y audio lejano | [V] |
| Idiomas | inglés (US/GB/AU/IN/NZ) y español (`es`, `es-419`); `multi` cubre 10 idiomas con cambio de idioma en la misma conversación | [V] |
| Diarización | Con Nova-3. En archivo: `speaker` y `speaker_confidence` por palabra (`diarize_model=latest`). En streaming solo `speaker`, más débil | [V] |
| Keyterm | Hasta 100 términos (recomendado 20-50): nombres de barcos, "ITA 32004", terminología de vela | [V] |
| Archivo | Máximo 2 GB; más de 10 min por petición da 504 (usar callback o fragmentar) | [V] |
| SDK | `@deepgram/sdk` para Node; la clave queda solo en el servidor (Fastify) | [V] |
| Región | `api.eu.deepgram.com` (misma clave) garantiza alojamiento en la UE; Nova-3 compatible | [V] |
| Privacidad | `mip_opt_out=true`: los datos se conservan solo lo necesario para procesar. Sin él, Deepgram puede guardar fragmentos y entrenar | [V] |
| Cumplimiento | SOC 2 Tipo 1 y 2, "GDPR ready"; el DPA se pide por contacto. No se encontró la política de retención oficial | [V]/[S] |
| Self-hosted | Existe pero por ventas (Dedicated/Enterprise); requisitos y precio sin verificar | [S] |
| MCP | Existe un servidor oficial (`dg mcp`) y de documentación; útil para que Claude Code transcriba archivos en desarrollo, no para la app | [V] |

**Precio** (pay-as-you-go, Nova-3): archivo $0,0043/min (multilingüe $0,0052);
streaming $0,0048/min (+$0,002 por diarizar); keyterm +$0,0013/min; crédito
inicial de $200 sin tarjeta. Archivo multilingüe con diarización y keyterm:
~$0,39/h. Una audiencia de 60 min ~ $0,40; 20 audiencias al año ~ $8, cubiertas
años por el crédito inicial. Si el opt-out tiene recargo: sin verificar.

**Riesgos.** El audio con voz de partes, testigos y menores sale de casa
(tercero en EE. UU., aunque con endpoint UE y opt-out). Exige aviso y
consentimiento previos y DPA firmado antes de usar audio real. Opt-out y endpoint
UE fijos en el servidor, no opcionales. Borrar el audio tras transcribir.
Transcripción opcional y rotulada "no verificada". Precisión en español con
audio de regata (viento, motores) sin medir.

**Frente a las alternativas.** Whisper local con pyannote
(`docker-whisper`/Speaches): privacidad total y gratis, diarización más floja,
mucha CPU y más esfuerzo. Deepgram gana en facilidad, precio y keyterms; pierde
en privacidad y "offline primero". AssemblyAI: similar, sin comparar.

**Diseño mínimo si se hace "subir audio y transcribir al final".** Endpoint
Fastify que recibe el archivo (tope de tamaño y duración, como los adjuntos),
llama a Deepgram con `nova-3`, `diarize_model=latest`, `punctuate`,
`smart_format`, `keyterm`, `mip_opt_out=true` y endpoint UE, devuelve la
transcripción y borra el audio. Sin HTTPS ni streaming. El resultado entra como
hearing notes automáticas (reutiliza `extractNotes.ts`).

**A probar con audio real (con el crédito gratuito):** diarización con 4-5
hablantes y solapamientos; inglés y español mezclados; efecto de los keyterms
en nombres de barco y números de vela; si el opt-out tiene recargo.

**Preguntas para el dueño.** ¿Aceptas que el audio salga de casa (UE, con
opt-out) o debe ser local? ¿Puedes conseguir un audio real, anonimizado o con
consentimiento, para probar? ¿Los eventos recogen consentimiento de grabación,
sobre todo con menores? ¿Quieres el DPA firmado antes de cualquier uso real?

---

<!-- Añadir nuevas ideas debajo como FUT-002, FUT-003… con el mismo formato. -->

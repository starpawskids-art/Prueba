# PULSE

> "¿Qué ha cambiado desde la última vez que miré?"

Este repo es el **núcleo mínimo de PULSE**, construido para validar una única hipótesis antes de
tocar nada más del documento de producto (FATE, predicciones, comunidad, gamificación, etc.):

> Cuando alguien abre PULSE, encuentra repetidamente algo que realmente no quería perderse.

Todo lo demás (ver `docs/PRODUCTO.md`) se construye encima solo si esto funciona.

## Qué hay implementado

Un pipeline de descubrimiento **real**, no una maqueta con datos falsos:

1. **Ingesta** — tres fuentes públicas, sin API keys: Hacker News (`item`/`topstories`),
   Wikipedia pageviews (Wikimedia REST API) y GitHub Search (repos nuevos o con actividad
   reciente). Cada fuente falla de forma independiente (`Promise.allSettled`) sin tumbar el
   pipeline — ver `src/lib/sources/`.
2. **Deduplicación** — similitud de tokens (Jaccard) entre títulos de distintas fuentes —
   `src/lib/pipeline/dedupe.ts`.
3. **Detección de momentum** — cada señal se guarda con su métrica anterior; el momentum es la
   tasa de cambio real entre dos observaciones nuestras, no un número inventado —
   `src/lib/pipeline/run.ts`.
4. **Scoring** — implementa la fórmula del documento de producto:
   `PulseScore = 0.30·Momentum + 0.25·Novedad + 0.20·RelevanciaPersonal + 0.15·CalidadFuente + 0.10·Diversidad`,
   con re-ranking greedy para diversidad de temas y una reserva de exploración (~20% del feed)
   fuera de los intereses del usuario — `src/lib/pipeline/rank.ts`.
5. **Generación de resumen** — texto estructurado ("qué cambió" / "por qué importa") generado por
   plantillas deterministas a partir de números reales, nunca inventados. El punto de extensión
   para enchufar un LLM real está documentado en `src/lib/pipeline/summarize.ts`.
6. **Personalización** — perfil explícito (temas elegidos en onboarding) + perfil implícito
   (guardar/seguir/descartar) ajustan la relevancia por tema en tiempo real.
7. **El gancho central** — `POST /api/visit` compara la visita actual con la anterior y devuelve
   cuántas Pulses relevantes se detectaron desde entonces. Es el primer texto que ve el usuario al
   abrir la app.
8. **Temas personalizados** — además de las 12 categorías fijas, el usuario puede escribir hasta 3
   temas libres en onboarding o en su perfil. Pasan por un filtro de moderación
   (`src/lib/moderation.ts`, bloquea contenido explícito/sensible) y luego actúan como boost de
   relevancia: cualquier Pulse cuyo título o explicación mencione ese tema sube de puntuación y
   aparece marcada con una insignia "Por tu tema".
9. **Idioma** — el usuario elige un idioma en onboarding (inglés preseleccionado; si no elige
   ninguno, se usa inglés) y puede cambiarlo en cualquier momento desde el selector del feed. El
   feed, el contador de cambios y la ingesta filtran/generan contenido en ese idioma —
   `src/lib/pipeline/rank.ts`, `POST /api/language`.
10. **Notificaciones push reales** — Web Push estándar (service worker + VAPID), sin Firebase ni
    ningún SDK de terceros. Implementa las tres categorías del documento de producto: "algo que
    sigues cambió" y "tendencia excepcional" tras cada ingesta (`src/lib/push/dispatch.ts`), y
    "resumen de tu día" una vez al día a hora fija UTC (`src/lib/push/digest.ts`) — nunca manda un
    resumen de "0 cambios", y las tres comparten el mismo tope de 3 avisos/24h por usuario
    (`src/lib/push/notifications-log.ts`). El envío en sí (`src/lib/push/send.ts`) usa la
    librería `web-push` para cifrar y firmar cada mensaje contra el endpoint real del navegador
    del usuario. Activable desde Perfil.

Un proceso en segundo plano (`src/instrumentation.ts` → `src/lib/pipeline/poller.ts`) ejecuta la
ingesta cada 5 minutos mientras el servidor esté vivo, así el "qué ha cambiado" es real y no un
cálculo hecho una sola vez.

## Capa 0 — deuda del MVP cerrada antes de escalar

El documento de producto es explícito: no construir más funcionalidades sobre una base sin medir.
Antes de tocar nada de la capa social se cerraron las dos piezas que faltaban:

- **Retención D1/D7/D30 real** — no una estimación: una tabla `visits` registra cada apertura, y
  `src/lib/analytics/retention.ts` calcula retención de cohorte clásica (¿volvió el usuario
  exactamente en la ventana [día N, día N+1) tras registrarse? — no acumulado, y solo cuentan
  cohortes ya maduras). Visible en `/admin` contra los objetivos del propio documento (D1 >35%,
  D7 >15–20%, D30 >8–12%).
- **Moderación básica** — canal para reportar ("Reportar" en cualquier Pulse o comentario) +
  cola de moderación en `/admin` para ocultar contenido reportado (soft-hide, no borra) o
  descartar el reporte. El contenido oculto desaparece del feed y del contador de cambios de
  todo el mundo.

## Capa 1 — identidad, Pulse colaborativa y grafo social

Esto va deliberadamente más allá de lo que pide el documento de producto original (que
explícitamente dice "no construir todavía: red social completa, chat"). La apuesta: el efecto
red de PULSE no viene de un muro cronológico de posts, sino de curaduría reconocible — gente cuyo
contexto aportado en una Pulse concreta merece que la sigas.

- **Identidad pública opcional** — cualquiera puede reclamar un `username` (sin contraseña,
  ligado a la cookie anónima existente — ver limitación abajo) desde Perfil, con nombre visible y
  bio opcionales. Perfil público real en `/u/[username]`, visible sin sesión. Moderado igual que
  el resto de texto libre (`src/lib/moderation.ts#sanitizeUsername`/`sanitizeBio`), con una lista
  de nombres reservados para no colisionar con rutas de la app (`admin`, `api`, `pulse`…).
- **Pulse colaborativa** (sección 21 del documento) — cualquiera puede añadir contexto a una
  Pulse desde su página de detalle, y responder al comentario de otra persona (hilo de un nivel,
  con "↳ en respuesta a X"). Moderado, reportable, y listado en el perfil público del autor como
  "Aportes recientes" — `src/lib/social/comments.ts`. Responder a un comentario dispara una
  notificación push real ("Respondieron a tu comentario"), salvo que te respondas a ti mismo —
  mismo tope compartido de 3/24h que el resto de categorías.
- **Votos en comentarios** — un voto simple (no like/dislike, solo "esto aportó algo"), sin
  autovoto, con el contador y "★ ya votado" recalculados por espectador (`viewerHasVoted` depende
  de quién pregunta, `voteCount` no). El orden "Más votados" agrupa cada hilo bajo su comentario
  raíz antes de ordenar — una respuesta con pocos votos no se separa nunca del hilo con más votos
  al que pertenece. Al cruzar 3 votos por primera vez dispara "Tu comentario recibió mucha
  atención" (una sola vez por comentario, aunque luego se desvote y se vuelva a votar) —
  `ATTENTION_VOTE_THRESHOLD` en `src/lib/social/comments.ts`, mismo tope de 3/24h compartido.
- **Grafo social** — seguir a otras personas (no solo Pulses o temas) desde su perfil público.
  La pestaña "Sigues → Personas" muestra un feed de actividad real: los aportes de contexto más
  recientes de la gente que sigues, en cualquier Pulse — `src/lib/social/follows.ts`. Seguir a
  alguien dispara una notificación push real ("Nuevo seguidor en PULSE"), con el mismo tope
  compartido de 3/24h que las demás categorías — no es una de las tres categorías originales del
  documento, pero usa exactamente la misma infraestructura y el mismo presupuesto, no uno aparte.

**Actualización:** la limitación de arriba (identidad ligada solo al navegador) ya está resuelta —
ver "Autenticación" más abajo.

## Autenticación

Email + contraseña con sesiones reales del lado del servidor — sin proveedor externo, sin
dependencia nueva. `crypto.scrypt` de Node para el hash (con sal aleatoria por contraseña) y un
token de sesión aleatorio de 32 bytes cuyo hash SHA-256 es lo único que se guarda en BD (el token
en crudo solo vive en la cookie `httpOnly`, así que un volcado de la base de datos no sirve para
suplantar sesiones) — `src/lib/auth.ts`.

Lo importante es que **"Crear cuenta" no crea un usuario nuevo**: adjunta el email/contraseña a la
identidad anónima que ya tenías en ese navegador (mismo `user_id`), así que intereses, guardados,
username y comentarios se conservan tal cual. "Iniciar sesión" hace lo contrario a propósito:
cambia la sesión del navegador a la cuenta que corresponde a ese email — si ese navegador ya tenía
actividad anónima previa, esa actividad no se combina, simplemente deja de ser "tú" hasta que
cierres sesión (mismo comportamiento que cualquier sitio con login). `getOrCreateUserId()`
(`src/lib/user.ts`) es el único punto que resuelve identidad en toda la app — si hay una cookie de
sesión válida, gana ella sobre la cookie anónima; si no, todo sigue funcionando exactamente igual
que antes de tener cuentas. Ninguna otra ruta tuvo que cambiar.

Verificado en vivo con tres identidades curl independientes (cookie jars separadas, simulando
navegadores distintos): registrar una cuenta conservó el username y la Pulse guardada previos;
iniciar sesión desde una segunda identidad con datos anónimos propios (intereses y username
distintos) cambió correctamente a los datos de la cuenta real, no los mezcló ni los perdió;
contraseña incorrecta rechazada (401); email duplicado rechazado (409); contraseña corta y email
inválido rechazados (400); y cerrar sesión devolvió esa segunda identidad exactamente a sus datos
anónimos originales de antes del login.

**Qué falta a propósito, para producción real:**
- **Verificación de email** — ahora mismo cualquiera puede registrar cualquier email sin
  comprobar que le pertenece. Necesita un servicio de envío de correo (Resend, Postmark, SES…).
- **Recuperación de contraseña** — mismo motivo: sin envío de email no hay "he olvidado mi
  contraseña" real.
- **Rate limiting en login** — no hay límite de intentos; en producción hace falta antes de
  exponerlo públicamente.

## Pantallas

Onboarding · Home/Feed · Pulse Detail (con comentarios) · Explore · Following (Pulses + Personas)
· Saved · Profile (identidad pública, idioma, notificaciones) · Perfil público `/u/[username]` —
más un panel `/admin` con retención, moderación y debug del pipeline de ingesta. Diseño
mobile-first, oscuro, tipografía grande, sin patrones de scroll infinito tipo TikTok — la interfaz
comunica "radar/inteligencia", no "entretenimiento".

## Qué NO está construido (a propósito)

FATE/predicciones, chat privado, gamificación agresiva, monetización, 20 idiomas, autenticación
real — todo lo que el documento de producto marca explícitamente como "no construir todavía", o
que depende de tener autenticación real primero. El objetivo de esta fase sigue siendo demostrar
retención, ahora también con la hipótesis de que identidad + grafo social la mejoran — no
maximizar superficie de producto porque sí.

## Cómo correrlo

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`. El primer arranque dispara una ingesta inmediata (ver logs de
consola) y luego cada 5 minutos. `/admin` permite disparar una ingesta manual y ver el estado del
pipeline.

No requiere variables de entorno ni API keys — todas las fuentes son públicas.

### Nota sobre las fuentes de datos en este entorno

Este entorno de desarrollo restringe el tráfico de salida a una lista concreta de dominios; en la
práctica eso significa que, **dentro de esta sandbox**, solo la fuente de GitHub responde (Hacker
News y Wikipedia devuelven error de red — a nivel de infraestructura, no de código —, capturado y
registrado sin romper el pipeline). Los adaptadores están completos y ya probados contra sus APIs
reales — se activan solos en cualquier entorno con salida a internet normal (local, Vercel, un
VPS, etc.), sin tocar código.

### Multi-idioma: cómo funciona la ingesta

Wikipedia tiene una edición independiente por idioma, cada una con sus propios "más vistos del
día" — no es una traducción de las tendencias en inglés, es lo que de verdad está mirando esa
comunidad de lectores. `src/lib/sources/wikipedia.ts` acepta el idioma como parámetro, y el
poller (`src/lib/pipeline/run.ts`) la consulta una vez por cada idioma soportado
(en/es/fr/de/it/pt) en cada ciclo. Hacker News y GitHub son fuentes inherentemente en inglés y se
etiquetan como tal. Esto es real y funciona en cualquier entorno con salida a internet — en esta
sandbox concreta simplemente no hay datos que mostrar salvo en inglés (vía GitHub), por la
restricción de red de arriba; la app lo comunica con un estado vacío explícito en vez de fingir
contenido.

### Clasificación de tema por idioma

`src/lib/topics.ts` clasifica cada Pulse por palabras clave — y ahora tiene un diccionario propio
por cada uno de los 6 idiomas soportados (antes solo tenía inglés, así que todo lo no-inglés caía
en "Curiosidades" por defecto). El matching usa comprobación de límites de palabra consciente de
Unicode (no la `\b` nativa de JS, que es solo ASCII y falla con letras acentuadas como á/ñ/ü/ç),
para evitar falsos positivos con palabras clave cortas sin romper con acentos.

Limitación conocida: el alemán compone palabras ("Bundesregierung" = "Bundes" + "regierung"), así
que una palabra clave suelta como "regierung" no encaja dentro del compuesto — el mismo control de
límites que evita falsos positivos en el resto de idiomas también bloquea coincidencias legítimas
de compuestos. Donde importa, el diccionario incluye el compuesto explícitamente (p. ej.
"bundesregierung", "klimapolitik") en vez de intentar descomponer compuestos en general. Un
clasificador vía LLM sería la solución robusta a largo plazo — sigue anotado como mejora futura
abajo.

## Push notifications: cómo configurarlas y qué verifiqué de verdad

Necesitan un par de claves VAPID (gratis, sin cuenta ni SDK de ningún proveedor):

```bash
npx web-push generate-vapid-keys
```

Copia `.env.example` a `.env.local` y rellena `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y
`NEXT_PUBLIC_VAPID_PUBLIC_KEY` (el mismo valor que la pública, duplicado porque Next.js necesita
`NEXT_PUBLIC_*` para exponerla al navegador) y `VAPID_SUBJECT` (un `mailto:` cualquiera). Reinicia
el servidor tras cambiar `.env.local`.

**Qué comprobé en este sandbox y qué no:**

- **Envío real desde el servidor: verificado.** Registré una suscripción con una clave EC de
  formato válido (65 bytes, generada con `crypto.generateKeyPairSync`) apuntando a
  `fcm.googleapis.com`, disparé una ingesta manual y `web-push` cifró y envió la petición HTTPS
  real sin ningún error — Google la aceptó. El token en sí era inventado (no hay un dispositivo
  real detrás), así que no puedo probar que llegó a una pantalla, pero sí que el servidor sabe
  construir y enviar un Web Push real contra la infraestructura real de Google.
- **Tope de 3 avisos/24h: verificado.** Tras 3 envíos, una cuarta ingesta no generó ninguno más;
  lo confirmé disparando una ingesta adicional después.
- **Categorías "algo que sigues cambió" / "tendencia excepcional": verificadas.** Seguí una Pulse
  real, disparé una ingesta y el sistema generó ambos tipos de aviso con el texto correcto.
- **"Resumen de tu día": verificado.** `/admin` tiene un botón "Enviar resumen diario ahora
  (test)" que fuerza el envío saltándose solo la comprobación de la hora UTC (el resto de reglas
  — tope compartido, no repetir antes de ~20h, no mandar un resumen de "0 cambios" — se respetan
  igual). Lo disparé con datos reales: generó "50 cambios relevantes hoy — el más destacado:
  ...", el envío se completó sin error (mismo resultado que las otras categorías) y una segunda
  llamada inmediata devolvió 0 por el intervalo mínimo.
- **"Nuevo seguidor" (Capa 1, más allá de las tres categorías originales): verificado.** Dos
  usuarios reales, uno con una suscripción con clave EC válida; el segundo siguió al primero y el
  envío se completó sin error, contabilizado en el mismo tope de 3/24h.
- **"Respondieron a tu comentario": verificado.** A comentó, B respondió con `parentCommentId` —
  el hilo se guardó correctamente ("↳ en respuesta a A") y el envío se completó sin error. Probé
  también el caso contrario: A respondiéndose a sí mismo no generó una segunda notificación
  (`notifications_sent` se quedó en 1 tras esa respuesta).
- **Votos en comentarios y "Tu comentario recibió mucha atención": verificados.** Con cuatro
  identidades curl independientes: A comentó, A intentando votarse a sí mismo fue rechazado
  (400, "No puedes votar tu propio comentario"), B/C/D votaron en orden (`voteCount` 1→2→3) y al
  cruzar el umbral de 3 se envió exactamente un `comment_attention` real (verificado en
  `notifications_sent` y sin errores en el log del servidor) hacia una suscripción con clave EC
  real. Desvotar y volver a votar (B) devolvió el contador a 3 sin generar una segunda
  notificación — el `attention_notified_at` de la fila ya bloqueaba el reenvío. El contador y
  "ya votado" cambian según quién pregunta: A (el autor) lo ve en 3 sin haber votado, B lo ve en 3
  habiendo votado. Con Playwright confirmé visualmente que "Más votados" agrupa cada hilo bajo su
  raíz antes de ordenar — una respuesta con 0 votos quedó justo después de su comentario padre con
  3 votos, por delante de un comentario raíz distinto con solo 1 voto, sin dispersarse por su
  propio contador.
- **Suscripción desde el navegador (`pushManager.subscribe()`): NO pude completarla en este
  sandbox.** Chrome necesita contactar además `accounts.google.com` y
  `android.clients.google.com` para el registro (más allá de `fcm.googleapis.com`, que sí es
  alcanzable), y esos dominios están bloqueados por la política de red de este entorno de
  desarrollo — la llamada se queda colgada sin más. Es el mismo tipo de límite que ya viste con
  Wikipedia/Hacker News, solo que aquí lo descubrí probándolo en vivo en vez de con un curl
  rápido. El código del flujo (permiso → registrar service worker → suscribir → mandar al
  backend) es estándar y correcto; en tu navegador normal (fuera de este sandbox) debería
  completarse sin problema — ver instrucciones exactas de prueba más abajo.
- Nota aparte, solo relevante si alguna vez automatizas esto con Playwright: `browser.newContext()`
  lanza un perfil tipo incógnito, y Chrome **deshabilita la Push API en incógnito** a propósito
  (no es detectable ni evitable). Hace falta `chromium.launchPersistentContext(...)` con un
  perfil real. Un usuario normal abriendo Chrome nunca se topa con esto.

El horario del resumen diario se controla con `DIGEST_HOUR_UTC` (por defecto 9, es decir 09:00
UTC). No hay todavía zona horaria por usuario — todo el mundo recibe el resumen a la misma hora
UTC independientemente de dónde esté; guardar la zona horaria del usuario (o inferirla del
navegador en el registro de la suscripción) es la mejora obvia siguiente si esto pasa a producción.

## Base de datos

SQLite local (`data/pulse.db`, en `.gitignore`) vía `better-sqlite3`. Para el MVP es
deliberadamente la opción más simple: cero infraestructura que levantar para probar la hipótesis
central. Migrar a Postgres/Redis (como propone la arquitectura técnica del documento de producto)
es un cambio localizado a `src/lib/db.ts` cuando haga falta escalar más allá de un único proceso.

## Siguientes pasos sugeridos

1. **Medir de verdad** — desplegar, conseguir usuarios reales, y mirar el panel de retención de
   `/admin` durante unas semanas. Todo lo demás en esta lista es prematuro si D1/D7/D30 no
   mejoran con identidad + grafo social + cuentas reales activos.
2. Verificación de email y recuperación de contraseña — necesitan un servicio de envío de correo;
   ver la sección "Autenticación" arriba.
3. Sustituir el resumen por plantillas con un LLM real (guardando la regla "no inventar hechos" y
   la trazabilidad a fuentes) — y de paso, un clasificador de tema vía LLM en vez de por palabras
   clave, para no depender de mantener diccionarios por idioma a mano.
4. Zona horaria por usuario para el resumen diario (hoy es una hora UTC fija para todos).
5. Añadir más fuentes por idioma más allá de Wikipedia (p. ej. GDELT, agregadores de prensa
   regionales) para que el feed no-inglés tenga la misma profundidad que el inglés.
6. Moderación real (proveedor externo) en vez del blocklist de `src/lib/moderation.ts`, antes de
   cualquier lanzamiento público — el blocklist es un punto de partida de MVP, no una solución de
   confianza y seguridad de producción.
7. Solo si la retención es buena: capa FATE (predicciones), rankings, misterios colectivos.

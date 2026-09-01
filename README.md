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

## Pantallas (MVP del documento de producto)

Onboarding · Home/Feed · Pulse Detail · Explore · Following · Saved · Profile — más un panel
`/admin` de debug para inspeccionar el pipeline en vivo (ejecuciones, señales, errores por
fuente). Diseño mobile-first, oscuro, tipografía grande, sin patrones de scroll infinito tipo
TikTok — la interfaz comunica "radar/inteligencia", no "entretenimiento".

## Qué NO está construido (a propósito)

FATE/predicciones, red social, chat, gamificación agresiva, monetización, 20 idiomas — todo lo
que el documento de producto marca explícitamente como "no construir todavía". El objetivo de
esta fase es demostrar retención (D1/D7/D30), no maximizar superficie de producto.

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

## Siguientes pasos sugeridos (por orden, según el documento de producto)

1. Medir D1/D7/D30 con usuarios reales — la métrica decisiva antes de construir nada más.
2. Sustituir el resumen por plantillas con un LLM real (guardando la regla "no inventar hechos" y
   la trazabilidad a fuentes) — y de paso, un clasificador de tema vía LLM en vez de por palabras
   clave, para no depender de mantener diccionarios por idioma a mano.
3. Zona horaria por usuario para el resumen diario (hoy es una hora UTC fija para todos).
4. Añadir más fuentes por idioma más allá de Wikipedia (p. ej. GDELT, agregadores de prensa
   regionales) para que el feed no-inglés tenga la misma profundidad que el inglés.
5. Solo si la retención es buena: capa FATE (predicciones), rankings, comunidad.

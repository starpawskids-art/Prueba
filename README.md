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

La clasificación de tema (`src/lib/topics.ts`) sigue siendo por palabras clave en inglés, así que
títulos en otros idiomas caen por defecto en "Curiosidades" salvo que el título contenga alguna
palabra clave en inglés. Mejorar esto (clasificador por idioma, o vía LLM) es la mejora obvia
siguiente y está anotada abajo.

## Base de datos

SQLite local (`data/pulse.db`, en `.gitignore`) vía `better-sqlite3`. Para el MVP es
deliberadamente la opción más simple: cero infraestructura que levantar para probar la hipótesis
central. Migrar a Postgres/Redis (como propone la arquitectura técnica del documento de producto)
es un cambio localizado a `src/lib/db.ts` cuando haga falta escalar más allá de un único proceso.

## Siguientes pasos sugeridos (por orden, según el documento de producto)

1. Medir D1/D7/D30 con usuarios reales — la métrica decisiva antes de construir nada más.
2. Clasificación de tema por idioma (o vía LLM) para que el contenido no-inglés no caiga siempre
   en "Curiosidades".
3. Sustituir el resumen por plantillas con un LLM real (guardando la regla "no inventar hechos" y
   la trazabilidad a fuentes).
4. Añadir push notifications reales (1–3/día, basadas en follows).
5. Añadir más fuentes por idioma más allá de Wikipedia (p. ej. GDELT, agregadores de prensa
   regionales) para que el feed no-inglés tenga la misma profundidad que el inglés.
6. Solo si la retención es buena: capa FATE (predicciones), rankings, comunidad.

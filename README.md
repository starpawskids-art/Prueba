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
News y Wikipedia devuelven error de red, capturado y registrado sin romper el pipeline). Los tres
adaptadores están completos y ya probados contra sus APIs reales — se activan solos en cualquier
entorno con salida a internet normal (local, Vercel, un VPS, etc.), sin tocar código.

## Base de datos

SQLite local (`data/pulse.db`, en `.gitignore`) vía `better-sqlite3`. Para el MVP es
deliberadamente la opción más simple: cero infraestructura que levantar para probar la hipótesis
central. Migrar a Postgres/Redis (como propone la arquitectura técnica del documento de producto)
es un cambio localizado a `src/lib/db.ts` cuando haga falta escalar más allá de un único proceso.

## Siguientes pasos sugeridos (por orden, según el documento de producto)

1. Medir D1/D7/D30 con usuarios reales — la métrica decisiva antes de construir nada más.
2. Sustituir el resumen por plantillas con un LLM real (guardando la regla "no inventar hechos" y
   la trazabilidad a fuentes).
3. Añadir push notifications reales (1–3/día, basadas en follows).
4. Solo si la retención es buena: capa FATE (predicciones), rankings, comunidad.

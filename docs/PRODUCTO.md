# PULSE — Documento de producto

> Producto conceptual: PULSE — el pulso del mundo, personalizado para ti
> Documento de producto, UX, arquitectura y roadmap de construcción · Versión 1.0 · Septiembre 2026

---

# 1. Resumen ejecutivo

PULSE es una aplicación móvil de descubrimiento en tiempo real. Su promesa: “abre la app y descubre qué ha cambiado en el mundo desde la última vez que entraste”. No pretende ser otra red social ni otro agregador de noticias. El producto detecta señales, tendencias, acontecimientos y conversaciones que están creciendo y las transforma en unidades de contenido breves, comprensibles y personalizadas.
La visión combina tres ideas: PULSE (el mundo en tiempo real), UNKNOWN (descubrir lo que todavía no sabes que existe) y FATE (una capa futura de predicción/personalización). La primera versión debe centrarse en PULSE + UNKNOWN. FATE se incorpora después de validar retención.
Objetivo de negocio: crear un producto B2C global, escalable y con alta frecuencia de apertura, monetizable mediante suscripción premium, publicidad contextual y funciones avanzadas. La prioridad inicial no es monetizar: es demostrar retención.

# 2. Visión y propuesta de valor

Visión: convertirse en la “ventana de cambios” de Internet: una app que responde en segundos a tres preguntas: ¿qué ha cambiado?, ¿qué está empezando a pasar? y ¿qué debería saber yo?
| Elemento | Definición |
| --- | --- |
| Problema | Internet contiene demasiadas señales; descubrir qué importa requiere buscar y filtrar manualmente. |
| Promesa | PULSE descubre cambios relevantes antes de que el usuario los encuentre por sí mismo. |
| Diferenciación | No organiza únicamente contenido existente: detecta señales emergentes, las agrupa, explica y personaliza. |
| Unidad de producto | La “Pulse”: un acontecimiento/señal con contexto, velocidad, importancia y nivel de novedad. |
| Resultado deseado | El usuario entra por curiosidad y vuelve porque sabe que el mundo habrá cambiado. |


# 3. Principios de producto

- Curiosidad antes que cantidad: cada tarjeta debe responder por qué merece atención.
- Frescura: priorizar acontecimientos recientes y cambios, no contenido evergreen.
- Personalización progresiva: aprender de clics, tiempo de lectura, descartes, temas y fuentes.
- Recompensa variable: el usuario no debe saber qué encontrará al abrir.
- Fricción mínima: abrir → entender → profundizar o deslizar.
- Transparencia: distinguir hechos, inferencias, predicciones y contenido generado.
- Calidad sobre engagement artificial: evitar patrones manipulativos, alarmismo y notificaciones abusivas.
- Global desde la arquitectura, pero con lanzamiento inicial limitado a un mercado/idioma para controlar costes.

# 4. Mecánica central


## 4.1. El ciclo adictivo legítimo

- El usuario abre la app.
- Ve un indicador de cambios desde su última visita: “Han ocurrido 23 cambios relevantes”.
- Recibe 5–10 Pulses iniciales de alto interés.
- Cada Pulse presenta un titular, qué cambió, por qué importa, fuentes y nivel de novedad.
- El usuario interactúa: abre, comparte, guarda, descarta o marca “más/menos como esto”.
- El sistema actualiza su perfil de intereses.
- El feed se reordena en tiempo real.
- Al salir, queda un motivo para volver: seguimiento de acontecimientos, alertas o resumen posterior.

## 4.2. Anatomía de una Pulse

| Campo | Ejemplo conceptual |
| --- | --- |
| Título | “Esta conversación acaba de explotar en Japón” |
| Cambio | “Menciones: +740% en 42 minutos” |
| Por qué importa | 2–3 frases explicativas. |
| Novedad | “Detectado hace 18 min” |
| Momentum | Índice interno de velocidad/crecimiento. |
| Confianza | Alta / media / baja, según evidencia. |
| Fuentes | Enlaces a fuentes originales y contexto. |
| Acciones | Guardar · Seguir · Compartir · No me interesa. |


# 5. Arquitectura funcional


## 5.1. Pipeline de descubrimiento

- Ingesta: APIs, feeds, fuentes públicas y proveedores de datos autorizados.
- Normalización: idioma, timestamp, entidad, URL, fuente y metadatos.
- Deduplicación: identificar historias equivalentes.
- Detección de eventos: clustering semántico de documentos/posteos relacionados.
- Detección de anomalías: comparar velocidad actual con baseline histórico.
- Scoring: novedad × velocidad × relevancia × calidad de fuente × diversidad.
- Generación: producir resumen estructurado con IA, sin inventar hechos.
- Verificación: comprobar que afirmaciones importantes están soportadas por fuentes.
- Personalización: calcular relevancia individual.
- Distribución: feed, push y digest.

## 5.2. Scoring inicial

Definir un score interpretable. Ejemplo conceptual: PulseScore = 0,30 Momentum + 0,25 Novedad + 0,20 RelevanciaPersonal + 0,15 CalidadFuente + 0,10 Diversidad. Los pesos no son definitivos: deben aprenderse mediante experimentación.

# 5.3. Personalización

- Perfil explícito: temas elegidos por el usuario.
- Perfil implícito: lecturas, skips, guardados, follows, shares y tiempo.
- Contexto: idioma, región aproximada, hora y sesión.
- Fatiga: penalizar repetición de un mismo tema.
- Exploración: reservar una parte del feed a descubrimiento fuera del perfil.

# 6. Experiencia de usuario


## Pantallas MVP

| Pantalla | Función |
| --- | --- |
| Onboarding | Elegir 5–8 intereses y activar ubicación/idioma opcionales. |
| Home / Pulse Feed | Feed vertical de Pulses. |
| Pulse Detail | Contexto, fuentes, evolución temporal y acciones. |
| Explore | Temas, regiones y señales emergentes. |
| Following | Acontecimientos y temas seguidos. |
| Saved | Pulses guardadas. |
| Profile | Preferencias, historial de intereses y métricas personales. |

Diseño recomendado: visual, rápido, tipografía grande, tarjetas limpias y una jerarquía de información de 3 segundos. Evitar replicar exactamente el patrón de TikTok; la interfaz debe comunicar “inteligencia/descubrimiento”, no “entretenimiento infinito”.

# 7. Notificaciones

Las notificaciones deben ser escasas y justificadas. Categorías: “algo que sigues cambió”, “tendencia excepcional”, “resumen de tu día” y, más adelante, predicciones. Límite inicial recomendado: 1–3 pushes/día por usuario, ajustable por comportamiento.
La frase clave no es “abre la app”, sino el valor: “El tema que sigues acaba de cambiar: +310% en 35 min”.

# 8. Fase FATE — predicciones

FATE se añade después de demostrar que PULSE funciona. Los usuarios podrán hacer predicciones sobre eventos medibles y ganar reputación/puntos. No usar dinero real en el MVP.
- Predicciones cerradas y verificables.
- Fecha límite y criterio de resolución claros.
- Score de precisión acumulado.
- Leaderboard opcional.
- Historial de predicciones.
- Separación visual absoluta entre hecho, señal y predicción.
Objetivo: crear una segunda razón para volver: “¿Qué ha cambiado?” + “¿Qué creo que ocurrirá?”

# 9. Gamificación y retención

- Rachas opcionales, sin castigar al usuario por faltar.
- Reputación basada en precisión/descubrimiento, no solo actividad.
- Logros: primer descubrimiento, predicción acertada, detector temprano, etc.
- Perfil de curiosidad: estadísticas sobre temas y patrones del usuario.
- Eventos colectivos: comunidades resolviendo o siguiendo una señal.
Evitar recompensas diseñadas exclusivamente para explotar compulsión. La ventaja competitiva debe ser la utilidad y la curiosidad real.

# 10. Modelo de datos mínimo

| Entidad | Datos clave |
| --- | --- |
| User | id, idioma, región, preferencias, created_at |
| Interest | id, nombre, jerarquía temática |
| Pulse | id, título, resumen, topic, timestamps, score, confidence |
| Source | id, URL, publisher, reliability_score |
| PulseSource | pulse_id, source_id |
| EventCluster | id, entidades, evolución, status |
| Interaction | user_id, pulse_id, type, timestamp |
| Follow | user_id, topic/event_id |
| Notification | user_id, type, pulse_id, sent_at |
| Prediction | user_id, event_id, forecast, deadline, outcome |


# 11. Arquitectura técnica propuesta

Stack recomendado para un MVP serio: aplicación móvil con React Native/Expo o Flutter; backend TypeScript con NestJS; PostgreSQL para datos transaccionales; Redis para cache/colas rápidas; un motor de búsqueda/vectorial para recuperación semántica; workers asíncronos para ingestión y procesamiento; almacenamiento de objetos para assets; observabilidad y analítica desde el día uno.
- API Gateway / backend API.
- Servicio de usuarios y preferencias.
- Servicio de ingestión.
- Event/Trend Detection Engine.
- AI Summarization & Verification Service.
- Recommendation Engine.
- Notification Service.
- Analytics/Event Tracking.
- Admin/Moderation Console.
Principio arquitectónico: desacoplar ingestión, detección, IA y recomendación. Así se puede cambiar de proveedor de IA o fuente de datos sin reescribir el producto.

# 12. IA

| Componente | Uso |
| --- | --- |
| LLM | Resumen, clasificación, extracción de entidades y explicación. |
| Embeddings | Similitud semántica y clustering. |
| Modelos de anomalías | Detección de crecimientos fuera de lo normal. |
| Ranking ML | Relevancia individual. |
| Guardrails | Detección de afirmaciones sin soporte, duplicados y contenido sensible. |

Regla crítica: el LLM no debe ser la fuente de verdad. Debe transformar y explicar datos recuperados. Cada Pulse factual debe mantener trazabilidad hacia sus fuentes.

# 13. Moderación, seguridad y confianza

- Lista de fuentes bloqueadas y fuentes con niveles de confianza.
- Detección de spam, contenido manipulado y duplicados.
- Etiquetado de incertidumbre.
- Registro de las fuentes que sustentan cada Pulse.
- Canal para reportar errores.
- Protección frente a campañas coordinadas que intenten manipular el ranking.
- Privacidad por diseño y minimización de datos personales.
Antes del lanzamiento público hay que revisar RGPD, consentimiento, cookies/trackers, tratamiento de datos, derechos de los usuarios, términos de servicio y política de contenidos aplicables a los mercados objetivo.

# 14. MVP — qué construir y qué NO construir


## Construir

- Onboarding.
- Feed de Pulses.
- Pipeline de ingestión de un conjunto reducido de fuentes.
- Detección de clusters y tendencias.
- Resúmenes con IA + fuentes.
- Personalización básica.
- Guardar/seguir/descartar.
- Push notifications.
- Analítica.
- Panel admin para revisar Pulses.

## No construir todavía

- Red social completa.
- Chat entre usuarios.
- Mundo virtual.
- Predicciones con dinero real.
- Marketplace.
- Avatar complejo.
- Decenas de categorías.
- Expansión a 20 idiomas.
- Algoritmo hipercomplejo antes de tener datos.

# 15. Roadmap de construcción

| Fase | Duración objetivo | Resultado |
| --- | --- | --- |
| 0. Validación | 1–2 semanas | Propuesta, prototipo y tests con usuarios. |
| 1. Diseño | 2 semanas | UX/UI y arquitectura definitiva. |
| 2. MVP técnico | 6–10 semanas | App + backend + ingestión + IA + ranking. |
| 3. Alpha privada | 2–3 semanas | 100–500 usuarios. |
| 4. Beta | 4–6 semanas | 1.000–10.000 usuarios; iteración de retención. |
| 5. Lanzamiento | Continuo | Crecimiento, monetización y expansión. |


# 16. Métricas


## North Star Metric

“Weekly Meaningful Discoveries”: número de Pulses que un usuario consume y considera relevantes, combinado con frecuencia de retorno. No optimizar únicamente DAU.
| Métrica | Objetivo inicial a validar |
| --- | --- |
| D1 retention | >35% como señal fuerte para un MVP de contenido. |
| D7 retention | >15–20% como primera referencia. |
| D30 retention | >8–12% sería una señal interesante. |
| Sesiones/usuario/día | 2+ en usuarios recurrentes. |
| Pulses relevantes/sesión | 3+. |
| Share rate | Medir por cohorte y tema. |
| Push open rate | Comparar por tipo de notificación. |

Estas cifras son objetivos de validación, no garantías ni benchmarks universales. La métrica decisiva será si la retención mejora cuando el sistema aprende al usuario.

# 17. Experimentación

- A/B test del mensaje “qué ha cambiado desde tu última visita”.
- 5 vs 10 Pulses iniciales.
- Feed cronológico vs ranking por relevancia.
- Más noticias vs más descubrimientos.
- Push de tendencia vs push personalizado.
- Onboarding corto vs selección detallada de intereses.
- Mostrar score/confianza vs interfaz limpia.
Cada experimento debe tener hipótesis, métrica primaria, duración, cohorte y criterio de decisión. No cambiar varias variables simultáneamente sin necesidad.

# 18. Monetización


## Fase 1

Gratis para maximizar adquisición y aprendizaje.

## Fase 2

- Premium: filtros avanzados.
- Alertas inteligentes.
- Historial ampliado.
- Temas ilimitados.
- Pulse Intelligence: explicaciones más profundas.
- Experiencia sin publicidad.

## Fase 3

Publicidad contextual de baja fricción y posibles productos B2B derivados de inteligencia de tendencias, sin convertir el producto principal en una herramienta empresarial.

# 19. Go-to-market

- Crear landing page con una sola promesa: “Descubre lo que está empezando a pasar.”
- Prototipo navegable y lista de espera.
- Publicar ejemplos reales de Pulses en redes.
- Crear contenido del tipo “Esto estaba ocurriendo 47 minutos antes de que se hiciera viral”.
- Invitar a usuarios beta mediante códigos.
- Medir retención antes de gastar fuerte en adquisición.
- Escalar solo cuando exista una señal clara de product-market fit.
El contenido de marketing debe demostrar el producto. Cada Pulse sorprendente puede convertirse automáticamente en una pieza para TikTok, Reels, Shorts y X.

# 20. Ventaja competitiva y moat

- Base histórica de señales y evolución temporal.
- Perfil de intereses aprendido a partir de comportamiento.
- Motor propio de detección de anomalías y clusters.
- Datos sobre qué señales resultaron realmente relevantes.
- Grafo de entidades, temas y acontecimientos.
- Reputación/feedback de usuarios.
- Infraestructura de ingestión y verificación.
La interfaz se puede copiar. El verdadero activo es el sistema de datos + detección + personalización + feedback acumulado.

# 21. Mejoras potenciales

- Mapa mundial de tendencias.
- Timeline de cómo una historia pasa de desconocida a viral.
- Modo “solo cosas que aún no son mainstream”.
- Radar personalizado: “esto puede interesarte en los próximos 30 minutos”.
- Comparador de cómo cubren el mismo acontecimiento distintas fuentes.
- Modo experto por sectores.
- Pulse colaborativa: usuarios aportan contexto.
- Audio briefing personalizado.
- Widget móvil con el pulso del momento.
- Apple/Google Watch y wearables.
- Predicciones FATE.
- Eventos/misterios colectivos tipo THE CASE.

# 22. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Demasiado ruido | Scoring y deduplicación estrictos. |
| Alucinaciones de IA | RAG, citas y verificación. |
| Sensacionalismo | Premiar calidad y confianza, no solo velocidad. |
| Coste de IA | Modelos pequeños para clasificación; LLM solo donde aporta valor. |
| Dependencia de fuentes | Diversificar proveedores y fuentes autorizadas. |
| Baja retención | Iterar sobre utilidad y personalización antes de añadir features. |
| Problemas legales | Revisión jurídica de fuentes, licencias, privacidad y contenidos. |
| Manipulación | Detección de anomalías coordinadas y reputación de fuentes. |


# 23. Plan de trabajo de las primeras 14 jornadas

- Día 1: cerrar propuesta y nombre de trabajo.
- Día 2: definir usuario objetivo y casos de uso.
- Día 3: mapa de experiencia.
- Día 4: arquitectura técnica.
- Día 5: modelo de datos.
- Día 6: selección de fuentes/proveedores.
- Día 7: prototipo de feed.
- Día 8: prototipo de Pulse Detail.
- Día 9: pipeline de ingestión.
- Día 10: clustering y scoring inicial.
- Día 11: generación/verificación de resumen.
- Día 12: personalización básica.
- Día 13: analítica + panel admin.
- Día 14: demo end-to-end y decisión Go/No-Go.

# 24. Definición de terminado del MVP

- Un usuario puede registrarse en menos de 60 segundos.
- El sistema puede generar Pulses nuevas de forma automática.
- Cada Pulse tiene fuentes trazables.
- El feed se personaliza según comportamiento.
- El usuario puede seguir, guardar y descartar.
- Las notificaciones pueden activarse por cambios relevantes.
- Existe panel para revisar y retirar contenido.
- Todos los eventos de producto importantes quedan registrados.
- El coste aproximado por usuario activo está monitorizado.
- Existe un mecanismo para medir D1/D7/D30.

# 25. Decisión estratégica

La recomendación es NO empezar construyendo “la aplicación definitiva”. Primero hay que demostrar una única hipótesis: “cuando una persona abre PULSE, encuentra repetidamente algo que realmente no quería perderse”. Si esa hipótesis es cierta, el resto —FATE, rankings, comunidad, mundo persistente y nuevas capas sociales— puede construirse encima.
El producto inicial debe sentirse como una mezcla de radar, descubrimiento y personalización. La frase que debe gobernar todas las decisiones de producto es:
“¿Qué ha cambiado desde la última vez que miré?”
Si conseguimos que esa pregunta aparezca de forma natural en la cabeza del usuario, tenemos el principio de un producto de alta frecuencia. La prioridad no es fabricar más funcionalidades: es conseguir que esa pregunta tenga una respuesta sorprendentemente buena cada vez.
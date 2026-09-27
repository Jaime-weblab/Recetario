# Recetario — webapp personal de recetas y planificación

## Contexto
App personal para gestionar recetas, planificar comidas semanales y generar la lista de la compra.
Uso principal desde iPhone como PWA (instalada con "Añadir a pantalla de inicio" en Safari).
Usuario único por ahora (yo), pero el modelo de datos debe permitir varios usuarios en el futuro.
Es probable que el alcance crezca: diseña pensando en ampliaciones, sin sobre-ingeniería.

## Sobre mí (cómo trabajar conmigo)
- Soy arquitecto, sé Python pero no soy programador profesional.
- **Comenta el código** en español: qué hace cada archivo, cada función y cualquier bloque no evidente.
- Antes de cambios grandes o de añadir una dependencia nueva, explícame brevemente qué y por qué, y espera confirmación.
- Trabaja por fases (ver abajo). No empieces una fase sin haber cerrado la anterior.
- Al terminar cada tarea, dime cómo probarla (en local y en el móvil).
- Prefiere soluciones simples y legibles frente a abstracciones sofisticadas.

## Stack
- **Framework:** Next.js (App Router) + TypeScript
- **Estilos:** Tailwind CSS
- **Base de datos, auth y archivos:** Supabase (Postgres + Auth con magic link + Storage para fotos)
- **IA:** Anthropic API (Claude), llamada SOLO desde el servidor (Route Handlers de Next.js)
- **Hosting:** Vercel, con despliegue automático desde GitHub
- **PWA:** manifest.json, iconos, pantalla completa en iOS

## Seguridad
- `ANTHROPIC_API_KEY` y `SUPABASE_SERVICE_ROLE_KEY` nunca en el cliente ni en el repositorio.
- Variables en `.env.local` (ignorado por git) y en Vercel.
- Row Level Security (RLS) activado en todas las tablas: cada usuario solo ve sus datos.
- Mantén un `.env.example` con los nombres de las variables, sin valores.

## Criterios de alimentación
- **Se prioriza la comida vegetariana.** Las recetas vegetarianas van primero en listados y sugerencias,
  aunque las no vegetarianas también se pueden guardar y planificar.
- **Variedad y no repetición:** las sugerencias evitan repetir un mismo plato dentro de la semana
  y en las semanas inmediatamente anteriores (consultar el historial de `meal_plan_entries`).
  También deben variar el ingrediente principal y el tipo de plato (legumbre, pasta, arroz, verdura, huevo...).

## Modelo de datos (propuesta inicial)
Ingredientes siempre estructurados (nombre + cantidad + unidad), nunca como texto libre,
para poder sumar cantidades en la lista de la compra.

- **recipes**: id, user_id, title, description, servings, prep_minutes, cook_minutes,
  category, tags (array), is_vegetarian, main_ingredient, dish_type, photo_url, source_url, notes, is_favorite, created_at, updated_at
- **ingredients** (catálogo propio): id, user_id, name, default_unit, shopping_section
  (frutería, carnicería, pescadería, lácteos, despensa, congelados, otros)
- **recipe_ingredients**: id, recipe_id, ingredient_id, quantity, unit, note (ej. "picado"), position
- **recipe_steps**: id, recipe_id, position, text
- **meal_plan_entries**: id, user_id, date, meal (comida | cena; dejar el campo preparado para añadir otras más adelante), recipe_id, servings
- **shopping_lists**: id, user_id, week_start, created_at
- **shopping_list_items**: id, list_id, ingredient_id (nullable), custom_name (para añadidos manuales),
  quantity, unit, shopping_section, is_checked

Unidades en sistema métrico (g, kg, ml, l, ud, cda, cdta, pizca). Conversión simple entre g/kg y ml/l.
Genera las migraciones SQL en `supabase/migrations/`.

## Fases

### Fase 0 — Base del proyecto — ✅ CERRADA (27-09-2026)
- Proyecto Next.js + Tailwind + Supabase configurado.
- Login con magic link. Rutas protegidas.
- PWA: manifest, iconos, meta tags de iOS, respeto de safe areas.
- Despliegue en Vercel funcionando.
- ✅ Hecho cuando: puedo instalarla en el iPhone y entrar con mi email.

### Fase 1 — Recetario
- Crear, editar, borrar y ver recetas (con ingredientes, pasos y foto).
- Listado con búsqueda, filtro por categoría/etiqueta y favoritas.
- Escalado de raciones en la ficha de receta.
- ✅ Hecho cuando: puedo guardar y consultar recetas cómodamente desde el móvil.

### Fase 2 — Planificación semanal
- Pantalla de Inicio según el boceto: selector de día (L–D) + tarjetas Comida y Cena.
- Asignar recetas a huecos, ajustar raciones, mover y quitar.
- Navegar entre semanas.
- ✅ Hecho cuando: puedo planificar una semana completa en pocos toques.

### Fase 3 — Lista de la compra
- Generar lista a partir del plan semanal: sumar cantidades del mismo ingrediente y unidad.
- Agrupar por sección del súper.
- Marcar como comprado, añadir artículos manuales.
- ✅ Hecho cuando: voy al súper solo con la lista del móvil.

### Fase 4 — Asesoramiento con IA
- Importar receta desde URL o texto pegado (Claude la convierte a nuestro formato estructurado).
- Importar receta desde foto (libro, captura).
- Sugerir un plan semanal a partir de mis recetas, aplicando los "Criterios de alimentación"
  (prioridad vegetariana, variedad, sin repetir platos recientes).
- Sugerir qué cocinar con lo que tengo.
- Modelo: `claude-sonnet-5`. Respuestas en JSON validado antes de guardar.
- ✅ Hecho cuando: puedo importar una receta de una web en un solo paso.

### Ideas futuras (no implementar todavía)
Despensa/inventario, información nutricional, compartir con otra persona, exportar a PDF, modo cocina paso a paso.

## Diseño
- Mobile-first; en escritorio basta con que sea usable.
- Objetivos táctiles de mínimo 44 px.
- Navegación inferior con 3 iconos: **Inicio** (casa) · **Recetas** · **Lista de la compra**.

### Estilo visual (elegido el 27-09-2026)
- **Paleta "Oliva"**: fondo crudo, verde oliva como color principal y mostaza para pequeños detalles.
- **Formas "Cuaderno"**: esquinas casi rectas, bordes finos, títulos con serifa (los de tarjeta en cursiva).
- **Tarjetas de receta**: foto pequeña cuadrada a la izquierda y título + datos a la derecha.
- Colores, esquinas y tipografías se definen solo en `app/globals.css` (clases `bg-accent`, `text-muted`,
  `border-line`, `rounded-card`, `rounded-control`, `font-serif`...). No usar colores sueltos en componentes.

### Pantalla de Inicio (boceto `docs/bocetos/inicio.jpeg`)
- Arriba, selector de días de la semana en una fila: L M X J V S D. El día actual aparece
  seleccionado por defecto y marcado visualmente.
- Debajo, dos tarjetas grandes apiladas para el día seleccionado: **Comida** y **Cena**.
- Tarjeta vacía: tocarla abre el selector de recetas para asignar una.
- Tarjeta con receta: muestra foto y título; tocarla abre la ficha de la receta.
- Deslizar lateralmente o flechas para cambiar de semana.
- Modo claro y oscuro según el sistema.
- Interfaz en español.
- Bocetos de referencia en `docs/bocetos/` (seguirlos cuando existan).
<!-- Completar aquí: tipografía, paleta y criterios visuales -->

## Estructura y convenciones
- Componentes en `components/`, lógica de datos en `lib/`, tipos en `types/`.
- Nombres de código en inglés, comentarios y textos de interfaz en español.
- Commits pequeños y descriptivos en español.

## Notas técnicas de Next.js (versión 16)
@AGENTS.md

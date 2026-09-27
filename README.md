# Recetario

App personal de recetas, menú semanal y lista de la compra (PWA para iPhone).
Visión general, fases y convenciones: ver [CLAUDE.md](CLAUDE.md).

## Arrancar en local

1. Instalar dependencias: `npm install`
2. Copiar `.env.example` como `.env.local` y rellenar la URL y la anon key de Supabase.
3. `npm run dev` y abrir http://localhost:3000

## Configuración de Supabase (una sola vez)

En el panel de tu proyecto de Supabase:

1. **Authentication → URL Configuration**
   - *Site URL*: la URL de Vercel (p. ej. `https://recetario-xxx.vercel.app`).
   - *Redirect URLs*: añadir `http://localhost:3000/**` y `https://recetario-xxx.vercel.app/**`.
2. **Authentication → Emails → Magic Link**: incluir el código de 6 dígitos en la plantilla,
   para poder entrar desde la app instalada en el iPhone (que no comparte sesión con Safari).
   Plantilla sugerida:
   ```html
   <h2>Entrar en Recetario</h2>
   <p>Tu código: <strong>{{ .Token }}</strong></p>
   <p>O pulsa este enlace: <a href="{{ .ConfirmationURL }}">Entrar</a></p>
   ```

## Estructura

- `app/` páginas y rutas (App Router). `app/(app)/` = zona privada con barra inferior.
- `components/` componentes de interfaz.
- `lib/` lógica de datos (clientes de Supabase en `lib/supabase/`).
- `proxy.ts` protege las rutas privadas (redirige a `/login` si no hay sesión).
- `scripts/generate-icons.mjs` regenera los iconos de la app.
- `supabase/migrations/` migraciones SQL (a partir de la Fase 1).

// Cliente de Supabase para el SERVIDOR (Server Components, Route Handlers y Server Actions).
// Lee y escribe la sesión del usuario en las cookies de la petición.
// Importante: crear uno nuevo en cada petición, nunca reutilizarlo entre usuarios.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Desde un Server Component no se pueden escribir cookies.
            // No pasa nada: el proxy (proxy.ts) ya se encarga de refrescar la sesión.
          }
        },
      },
    },
  );
}

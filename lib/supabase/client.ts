// Cliente de Supabase para el NAVEGADOR (componentes con "use client").
// Usa solo la clave pública "anon"; la seguridad real la ponen las reglas RLS de la base de datos.
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

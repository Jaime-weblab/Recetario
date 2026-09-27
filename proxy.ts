// Proxy de Next.js (antes llamado "middleware"): se ejecuta antes de cada página.
// Aquí solo delegamos en updateSession, que protege las rutas privadas.
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Se aplica a todo EXCEPTO archivos estáticos: imágenes, iconos, manifest, etc.
  // (si no, la pantalla de login no podría cargar ni su propio icono).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

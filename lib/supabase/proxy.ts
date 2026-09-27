// Lógica que se ejecuta en CADA petición antes de mostrar una página (la llama /proxy.ts).
// Hace dos cosas:
//   1. Refresca la sesión de Supabase si ha caducado (y guarda las cookies nuevas).
//   2. Si no hay usuario y la ruta es privada, redirige a /login.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rutas que se pueden visitar sin haber iniciado sesión.
const PUBLIC_PATHS = ["/login", "/auth"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        // Cuando Supabase renueva la sesión, copiamos las cookies nuevas
        // tanto a la petición (para esta misma carga) como a la respuesta (para el navegador).
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          // Cabeceras anti-caché para que nadie reciba la sesión de otro.
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // getClaims() valida el token del usuario. No meter código entre createServerClient y esta línea.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));

  // Sin sesión en una ruta privada → a /login.
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Con sesión en /login → a Inicio (no tiene sentido volver a entrar).
  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

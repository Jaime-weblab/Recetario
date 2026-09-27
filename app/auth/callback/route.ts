// Destino del enlace mágico del email. Convierte el enlace en una sesión (cookies) y lleva a Inicio.
// Acepta los dos formatos que puede enviar Supabase:
//   - ?code=...                     (flujo PKCE, plantilla de email por defecto)
//   - ?token_hash=...&type=email    (plantilla de email personalizada)
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let error: unknown = null;

  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
  } else {
    error = "missing_params";
  }

  // Si algo falla (enlace caducado, abierto en otro navegador...), volvemos a /login con aviso.
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=enlace`);
  }
  return NextResponse.redirect(`${origin}/`);
}

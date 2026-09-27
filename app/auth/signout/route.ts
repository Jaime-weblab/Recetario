// Cierra la sesión (borra las cookies de Supabase) y vuelve a /login.
// Es POST para que un simple enlace o una precarga del navegador no te saquen sin querer.
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // 303 = "ve a esta página con GET" (lo correcto tras enviar un formulario).
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}

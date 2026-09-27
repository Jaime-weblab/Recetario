// POST /api/importar/texto  { text }  →  { recipe: RecipeInput }  o  { error }
// Convierte una receta copiada como texto (de una web, un mensaje, una nota…) a nuestro formato.
// No guarda nada: el usuario la revisa en el formulario.
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AiError } from "@/lib/ai";
import { extractRecipe } from "@/lib/import/claude";

export const maxDuration = 120;

const MAX_CHARS = 60_000;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) return NextResponse.json({ error: "No has iniciado sesión." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (text.length < 20) return NextResponse.json({ error: "Pega el texto completo de la receta." }, { status: 400 });

  try {
    const recipe = await extractRecipe([
      { type: "text", text: `Texto de una receta copiado por el usuario:\n\n${text.slice(0, MAX_CHARS)}` },
    ]);
    return NextResponse.json({ recipe });
  } catch (error) {
    if (error instanceof AiError) return NextResponse.json({ error: error.message }, { status: 422 });
    console.error("importar/texto", error);
    return NextResponse.json({ error: "Error inesperado al importar la receta." }, { status: 500 });
  }
}

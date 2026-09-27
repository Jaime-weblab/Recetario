// POST /api/sugerir  { monday, meals: ["cena"] | ["comida","cena"] }  →  { suggestions }  o  { error }
// Pide a Claude una propuesta para los huecos vacíos de la semana. No guarda nada:
// el usuario la revisa y la acepta con la acción applySuggestions.
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AiError } from "@/lib/ai";
import { isIsoDate, mondayOf } from "@/lib/dates";
import { suggestWeek } from "@/lib/suggest";
import { MEALS, type Meal } from "@/types/plan";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) return NextResponse.json({ error: "No has iniciado sesión." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { monday?: unknown; meals?: unknown } | null;
  const monday = typeof body?.monday === "string" && isIsoDate(body.monday) ? mondayOf(body.monday) : null;
  const meals = Array.isArray(body?.meals) ? MEALS.filter((m) => (body.meals as unknown[]).includes(m)) : [];
  if (!monday || meals.length === 0) return NextResponse.json({ error: "Petición no válida." }, { status: 400 });

  try {
    const suggestions = await suggestWeek(monday, meals as Meal[]);
    return NextResponse.json({ suggestions });
  } catch (error) {
    if (error instanceof AiError) return NextResponse.json({ error: error.message }, { status: 422 });
    console.error("sugerir", error);
    return NextResponse.json({ error: "Error inesperado al sugerir el menú." }, { status: 500 });
  }
}

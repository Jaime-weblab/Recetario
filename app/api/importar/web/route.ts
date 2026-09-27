// POST /api/importar/web  { url }  →  { recipe: RecipeInput }  o  { error }
// Descarga la web, pide a Claude que extraiga la receta y copia la foto del plato a nuestro Storage.
// No guarda la receta: la devuelve para que el usuario la revise en el formulario.
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractRecipe, ImportError } from "@/lib/import/claude";
import { downloadImage, fetchRecipePage } from "@/lib/import/web";
import { PHOTO_BUCKET } from "@/lib/photo-paths";

// Claude puede tardar unos segundos; damos margen (en segundos) antes de que Vercel corte.
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  // Solo usuarios con sesión (esta ruta gasta saldo de Anthropic).
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "No has iniciado sesión." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
  if (typeof body?.url !== "string" || !body.url.trim()) {
    return NextResponse.json({ error: "Falta el enlace." }, { status: 400 });
  }

  try {
    const page = await fetchRecipePage(body.url);

    // Si la web trae la receta en formato schema.org con ingredientes y pasos, enviamos solo eso;
    // si no, el texto visible de la página.
    const json = page.recipeJson as Record<string, unknown> | null;
    const hasFullJson = Boolean(json?.recipeIngredient && json?.recipeInstructions);
    const content = hasFullJson
      ? `Receta de la web ${page.url} (título de la página: "${page.title}").\nDatos estructurados schema.org:\n${JSON.stringify(json)}`
      : `Texto de la web ${page.url} (título: "${page.title}"):\n\n${page.text}`;

    const recipe = await extractRecipe([{ type: "text", text: content }], { sourceUrl: page.url });

    // Foto del plato: la copiamos a nuestro almacenamiento (si falla, se importa sin foto).
    if (page.imageUrl) {
      const image = await downloadImage(page.imageUrl);
      if (image) {
        const path = `${userId}/${crypto.randomUUID()}.${image.ext}`;
        const { error } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(path, image.bytes, { contentType: image.type, cacheControl: "31536000" });
        if (!error) recipe.photo_url = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
      }
    }

    return NextResponse.json({ recipe });
  } catch (error) {
    if (error instanceof ImportError) return NextResponse.json({ error: error.message }, { status: 422 });
    console.error("importar/web", error);
    return NextResponse.json({ error: "Error inesperado al importar la receta." }, { status: 500 });
  }
}

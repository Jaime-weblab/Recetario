// POST /api/importar/fotos  { images: [{ data, media_type }] }  →  { recipe: RecipeInput }  o  { error }
// Recibe de 1 a 3 fotos (ya reducidas en el móvil, en base64) de una receta — p. ej. páginas
// de un libro o capturas — y pide a Claude que la lea. No guarda nada: el usuario la revisa antes.
import { NextResponse, type NextRequest } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { extractRecipe, ImportError } from "@/lib/import/claude";

export const maxDuration = 120;

const MAX_IMAGES = 3;
const MAX_BASE64_CHARS = 3_000_000; // ~2,2 MB por foto (llegan reducidas, suelen ser ~0,5 MB)
const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type MediaType = (typeof MEDIA_TYPES)[number];

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) return NextResponse.json({ error: "No has iniciado sesión." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { images?: unknown } | null;
  const images = Array.isArray(body?.images) ? body.images : [];
  if (images.length === 0 || images.length > MAX_IMAGES) {
    return NextResponse.json({ error: `Envía entre 1 y ${MAX_IMAGES} fotos.` }, { status: 400 });
  }

  // Comprobamos cada foto y la convertimos en un bloque de imagen para Claude.
  const blocks: Anthropic.ContentBlockParam[] = [];
  for (const image of images as { data?: unknown; media_type?: unknown }[]) {
    const valid =
      typeof image?.data === "string" &&
      image.data.length > 0 &&
      image.data.length <= MAX_BASE64_CHARS &&
      MEDIA_TYPES.includes(image.media_type as MediaType);
    if (!valid) return NextResponse.json({ error: "Alguna foto no es válida o es demasiado grande." }, { status: 400 });
    blocks.push({
      type: "image",
      source: { type: "base64", media_type: image.media_type as MediaType, data: image.data as string },
    });
  }
  blocks.push({
    type: "text",
    text:
      images.length > 1
        ? "Estas fotos contienen una receta (pueden ser varias páginas, en orden). Extrae la receta completa."
        : "Esta foto contiene una receta. Extráela.",
  });

  try {
    const recipe = await extractRecipe(blocks);
    return NextResponse.json({ recipe });
  } catch (error) {
    if (error instanceof ImportError) return NextResponse.json({ error: error.message }, { status: 422 });
    console.error("importar/fotos", error);
    return NextResponse.json({ error: "Error inesperado al importar la receta." }, { status: 500 });
  }
}

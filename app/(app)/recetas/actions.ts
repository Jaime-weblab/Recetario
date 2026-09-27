"use server";
// Acciones del servidor para recetas: guardar (crear/editar), borrar y marcar favorita.
// Se llaman desde los componentes como si fueran funciones normales, pero se ejecutan
// en el servidor. Cualquiera podría llamarlas directamente, por eso cada una comprueba
// que hay sesión (y RLS impide tocar datos ajenos).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PHOTO_BUCKET, photoPathFromUrl } from "@/lib/photo-paths";
import { DISH_TYPES, UNITS, type RecipeInput } from "@/types/recipe";
import { SECTIONS, type ShoppingSection } from "@/types/shopping";

// Devuelve el cliente de Supabase y el id del usuario, o lanza error si no hay sesión.
async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) throw new Error("No has iniciado sesión.");
  return { supabase, userId };
}

// Texto recortado; si queda vacío → null (para guardar "sin valor" en la base de datos).
const clean = (s: string | null | undefined) => {
  const t = (s ?? "").trim();
  return t ? t : null;
};

// Borra una foto del almacenamiento a partir de su URL (si es de nuestro bucket).
// Si falla no pasa nada grave (quedaría un archivo huérfano), así que solo lo anotamos.
async function removePhoto(supabase: Awaited<ReturnType<typeof createClient>>, url: string | null) {
  const path = photoPathFromUrl(url);
  if (!path) return;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([path]);
  if (error) console.error("removePhoto", error.message);
}

// Número entero ≥ 0 o null.
const minutes = (n: number | null) =>
  n != null && Number.isFinite(n) && n >= 0 ? Math.round(n) : null;

// Revisa y limpia lo que llega del formulario. Devuelve un mensaje de error o los datos limpios.
function validate(input: RecipeInput) {
  const title = clean(input.title);
  if (!title) return { error: "La receta necesita un título." } as const;

  const servings = Math.round(Number(input.servings));
  if (!Number.isFinite(servings) || servings < 1) {
    return { error: "Las raciones deben ser 1 o más." } as const;
  }

  // Solo aceptamos enlaces web de verdad (evita guardar cosas raras como "javascript:").
  const source = clean(input.source_url);
  const sourceUrl = source && /^https?:\/\//i.test(source) ? source : null;

  // Líneas de ingredientes: se ignoran las filas sin nombre.
  const ingredients = input.ingredients
    .map((line) => ({
      name: (line.name ?? "").trim(),
      quantity: line.quantity != null && line.quantity > 0 ? line.quantity : null,
      unit: line.unit && UNITS.includes(line.unit) ? line.unit : null,
      note: clean(line.note),
      section: line.section && SECTIONS.includes(line.section) ? line.section : null,
    }))
    .filter((line) => line.name);

  const steps = input.steps.map((s) => s.trim()).filter(Boolean);

  const recipe = {
    title,
    description: clean(input.description),
    servings,
    prep_minutes: minutes(input.prep_minutes),
    cook_minutes: minutes(input.cook_minutes),
    // Etiquetas en minúscula, sin repetir.
    tags: [...new Set(input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))],
    is_vegetarian: Boolean(input.is_vegetarian),
    main_ingredient: clean(input.main_ingredient),
    dish_type: input.dish_type && DISH_TYPES.includes(input.dish_type) ? input.dish_type : null,
    // Solo aceptamos fotos subidas a nuestro propio almacenamiento.
    photo_url: photoPathFromUrl(input.photo_url) ? clean(input.photo_url) : null,
    source_url: sourceUrl,
    notes: clean(input.notes),
  };

  return { recipe, ingredients, steps } as const;
}

// Busca en el catálogo los ingredientes por nombre (sin distinguir mayúsculas) y crea los que falten.
// Devuelve un mapa "nombre en minúscula" → id.
async function resolveIngredientIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lines: { name: string; unit: string | null; section: ShoppingSection | null }[],
) {
  const ids = new Map<string, string>();
  if (lines.length === 0) return ids;

  // El catálogo de una persona es pequeño: lo traemos entero y comparamos aquí.
  const { data: existing, error } = await supabase.from("ingredients").select("id, name, shopping_section");
  if (error) throw new Error(error.message);
  for (const row of existing ?? []) ids.set(row.name.toLowerCase(), row.id);

  // Ingredientes que ya existían en "otros" y ahora nos llega su sección (importación): la guardamos.
  for (const row of existing ?? []) {
    if (row.shopping_section !== "otros") continue;
    const line = lines.find((l) => l.section && l.section !== "otros" && l.name.toLowerCase() === row.name.toLowerCase());
    if (line) await supabase.from("ingredients").update({ shopping_section: line.section }).eq("id", row.id);
  }

  // Ingredientes nuevos (sin repetir). Su unidad habitual será la usada en esta receta.
  const missing = new Map<string, { name: string; default_unit: string | null; shopping_section: ShoppingSection }>();
  for (const line of lines) {
    const key = line.name.toLowerCase();
    if (!ids.has(key) && !missing.has(key)) {
      missing.set(key, { name: line.name, default_unit: line.unit, shopping_section: line.section ?? "otros" });
    }
  }
  if (missing.size > 0) {
    const { data: created, error: insertError } = await supabase
      .from("ingredients")
      .insert([...missing.values()])
      .select("id, name");
    if (insertError) throw new Error(insertError.message);
    for (const row of created ?? []) ids.set(row.name.toLowerCase(), row.id);
  }
  return ids;
}

// Crea (si id es null) o actualiza una receta completa.
// Si todo va bien, redirige a su ficha; si no, devuelve { error } para mostrarlo en el formulario.
export async function saveRecipe(id: string | null, input: RecipeInput): Promise<{ error: string }> {
  const { supabase } = await requireUser();

  const checked = validate(input);
  if ("error" in checked) return { error: checked.error as string };
  const { recipe, ingredients, steps } = checked;

  let recipeId = id;
  // Foto que tenía la receta antes de editarla (para borrarla si se cambia o se quita).
  let oldPhotoUrl: string | null = null;
  try {
    // 1. Datos principales de la receta.
    if (recipeId) {
      const { data: old } = await supabase.from("recipes").select("photo_url").eq("id", recipeId).maybeSingle();
      oldPhotoUrl = old?.photo_url ?? null;
      const { error } = await supabase.from("recipes").update(recipe).eq("id", recipeId);
      if (error) throw new Error(error.message);
    } else {
      const { data, error } = await supabase.from("recipes").insert(recipe).select("id").single();
      if (error) throw new Error(error.message);
      recipeId = data.id as string;
    }

    // 2. Ingredientes: se buscan/crean en el catálogo y se reemplazan todas las líneas.
    const ingredientIds = await resolveIngredientIds(supabase, ingredients);
    const { error: delIngError } = await supabase
      .from("recipe_ingredients")
      .delete()
      .eq("recipe_id", recipeId);
    if (delIngError) throw new Error(delIngError.message);
    if (ingredients.length > 0) {
      const { error } = await supabase.from("recipe_ingredients").insert(
        ingredients.map((line, position) => ({
          recipe_id: recipeId,
          ingredient_id: ingredientIds.get(line.name.toLowerCase()),
          quantity: line.quantity,
          unit: line.unit,
          note: line.note,
          position,
        })),
      );
      if (error) throw new Error(error.message);
    }

    // 3. Pasos: se reemplazan todos.
    const { error: delStepError } = await supabase
      .from("recipe_steps")
      .delete()
      .eq("recipe_id", recipeId);
    if (delStepError) throw new Error(delStepError.message);
    if (steps.length > 0) {
      const { error } = await supabase
        .from("recipe_steps")
        .insert(steps.map((text, position) => ({ recipe_id: recipeId, position, text })));
      if (error) throw new Error(error.message);
    }
  } catch (e) {
    // Si era una receta NUEVA y algo ha fallado a medias, la borramos para no dejarla incompleta.
    if (!id && recipeId) await supabase.from("recipes").delete().eq("id", recipeId);
    console.error("saveRecipe", e);
    return { error: "No se ha podido guardar la receta. Inténtalo de nuevo." };
  }

  // Guardado correcto: si la foto ha cambiado o se ha quitado, borramos la antigua.
  if (oldPhotoUrl && oldPhotoUrl !== recipe.photo_url) await removePhoto(supabase, oldPhotoUrl);

  revalidatePath("/recetas");
  redirect(`/recetas/${recipeId}`);
}

// Borra una receta (sus ingredientes y pasos se borran solos, en cascada), su foto,
// y vuelve al listado.
export async function deleteRecipe(id: string) {
  const { supabase } = await requireUser();
  const { data: old } = await supabase.from("recipes").select("photo_url").eq("id", id).maybeSingle();
  const { error } = await supabase.from("recipes").delete().eq("id", id);
  if (error) throw new Error("No se ha podido borrar la receta.");
  await removePhoto(supabase, old?.photo_url ?? null);
  revalidatePath("/recetas");
  redirect("/recetas");
}

// Marca o desmarca una receta como favorita.
export async function setFavorite(id: string, isFavorite: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("recipes").update({ is_favorite: isFavorite }).eq("id", id);
  if (error) throw new Error("No se ha podido actualizar la favorita.");
  revalidatePath("/recetas");
  revalidatePath(`/recetas/${id}`);
}

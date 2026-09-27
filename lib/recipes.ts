// Lectura de recetas desde Supabase (solo en el servidor).
// La seguridad RLS ya garantiza que cada usuario solo recibe SUS recetas.
import { createClient } from "@/lib/supabase/server";
import type { RecipeListItem, RecipeWithDetails } from "@/types/recipe";

// Listado de recetas: vegetarianas primero, luego por título.
// Incluye los nombres de los ingredientes de cada receta, para poder buscar por ellos.
export async function listRecipes(): Promise<RecipeListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("*, lines:recipe_ingredients (ingredient:ingredients (name))")
    .order("is_vegetarian", { ascending: false })
    .order("title", { ascending: true });
  if (error) throw new Error(`No se pudieron cargar las recetas: ${error.message}`);

  // Aplanamos "lines" a una simple lista de nombres.
  type Row = RecipeListItem & { lines: { ingredient: { name: string } | null }[] };
  return (data as unknown as Row[]).map(({ lines, ...recipe }) => ({
    ...recipe,
    ingredient_names: lines.map((l) => l.ingredient?.name).filter((n): n is string => Boolean(n)),
  }));
}

// Receta completa (con ingredientes y pasos) o null si no existe / no es mía.
export async function getRecipe(id: string): Promise<RecipeWithDetails | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(
      `*,
       ingredients:recipe_ingredients (id, quantity, unit, note, position, ingredient:ingredients (id, name)),
       steps:recipe_steps (id, position, text)`,
    )
    .eq("id", id)
    .maybeSingle();
  // Un id mal formado también da error: lo tratamos como "no existe".
  if (error || !data) return null;

  const recipe = data as unknown as RecipeWithDetails;
  // Supabase no garantiza el orden de las listas anidadas: las ordenamos aquí.
  recipe.ingredients.sort((a, b) => a.position - b.position);
  recipe.steps.sort((a, b) => a.position - b.position);
  return recipe;
}

// Nombres del catálogo de ingredientes, para sugerirlos al escribir.
export async function listIngredientNames(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("ingredients").select("name").order("name");
  return (data ?? []).map((row) => row.name as string);
}

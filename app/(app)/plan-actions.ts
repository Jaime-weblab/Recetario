"use server";
// Acciones del servidor para el menú semanal: asignar, quitar, cambiar raciones y mover.
// Como todas las acciones, comprueban la sesión (RLS impide además tocar datos ajenos).
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isIsoDate } from "@/lib/dates";
import { getWeekPlan } from "@/lib/plan";
import { MEALS, type Meal, type PlanEntry } from "@/types/plan";

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) throw new Error("No has iniciado sesión.");
  return { supabase, userId };
}

// Comprueba que el hueco (fecha + comida/cena) es válido.
function checkSlot(date: string, meal: string): asserts meal is Meal {
  if (!isIsoDate(date) || !MEALS.includes(meal as Meal)) throw new Error("Hueco no válido.");
}

// Tras cualquier cambio, refrescamos Inicio (y las fichas, que muestran "Añadir al menú").
function refresh() {
  revalidatePath("/");
}

// Pone una receta en un hueco. Si ya había otra, la sustituye.
// Si no se indican raciones, se usan las de la receta.
export async function assignRecipe(date: string, meal: Meal, recipeId: string, servings?: number) {
  checkSlot(date, meal);
  const { supabase, userId } = await requireUser();

  let finalServings = servings;
  if (!finalServings) {
    const { data } = await supabase.from("recipes").select("servings").eq("id", recipeId).single();
    finalServings = data?.servings ?? 2;
  }

  // "upsert" = insertar, o actualizar si ya existe una fila para ese mismo hueco.
  const { error } = await supabase
    .from("meal_plan_entries")
    .upsert(
      { user_id: userId, date, meal, recipe_id: recipeId, servings: finalServings },
      { onConflict: "user_id,date,meal" },
    );
  if (error) throw new Error("No se ha podido añadir al menú.");
  refresh();
}

// Quita la receta de un hueco.
export async function removeEntry(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("meal_plan_entries").delete().eq("id", id);
  if (error) throw new Error("No se ha podido quitar.");
  refresh();
}

// Cambia las raciones de un plato del menú (mínimo 1).
export async function setEntryServings(id: string, servings: number) {
  const { supabase } = await requireUser();
  const value = Math.max(1, Math.round(servings));
  const { error } = await supabase.from("meal_plan_entries").update({ servings: value }).eq("id", id);
  if (error) throw new Error("No se han podido cambiar las raciones.");
  refresh();
}

// Mueve un plato a otro hueco. Si el destino está ocupado, los dos platos se intercambian.
export async function moveEntry(id: string, toDate: string, toMeal: Meal) {
  checkSlot(toDate, toMeal);
  const { supabase, userId } = await requireUser();

  const { data: source } = await supabase
    .from("meal_plan_entries")
    .select("id, date, meal, recipe_id, servings")
    .eq("id", id)
    .single();
  if (!source) throw new Error("Ese plato ya no está en el menú.");
  if (source.date === toDate && source.meal === toMeal) return; // mismo hueco: nada que hacer

  const { data: target } = await supabase
    .from("meal_plan_entries")
    .select("id, recipe_id, servings")
    .eq("date", toDate)
    .eq("meal", toMeal)
    .maybeSingle();

  // Para no chocar con la regla "un plato por hueco", borramos y volvemos a crear las filas.
  const ids = target ? [source.id, target.id] : [source.id];
  const { error: delError } = await supabase.from("meal_plan_entries").delete().in("id", ids);
  if (delError) throw new Error("No se ha podido mover.");

  const rows = [
    { user_id: userId, date: toDate, meal: toMeal, recipe_id: source.recipe_id, servings: source.servings },
  ];
  if (target) {
    rows.push({ user_id: userId, date: source.date, meal: source.meal, recipe_id: target.recipe_id, servings: target.servings });
  }
  const { error: insError } = await supabase.from("meal_plan_entries").insert(rows);
  if (insError) throw new Error("No se ha podido mover.");
  refresh();
}

// Menú de una semana, para el selector de huecos de "Añadir al menú" (se llama desde la ficha).
export async function fetchWeekPlan(monday: string): Promise<PlanEntry[]> {
  if (!isIsoDate(monday)) throw new Error("Fecha no válida.");
  await requireUser();
  return getWeekPlan(monday);
}

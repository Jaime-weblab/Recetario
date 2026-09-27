// Lectura del menú semanal desde Supabase (solo en el servidor; RLS filtra por usuario).
import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/dates";
import type { PlanEntry } from "@/types/plan";

// Columnas que pedimos: la entrada + los datos de su receta necesarios para la tarjeta.
export const PLAN_ENTRY_SELECT =
  "id, date, meal, servings, recipe:recipes (id, title, photo_url, servings, is_vegetarian, dish_type)";

// Todas las entradas de la semana que empieza en `monday` (lunes a domingo).
export async function getWeekPlan(monday: string): Promise<PlanEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meal_plan_entries")
    .select(PLAN_ENTRY_SELECT)
    .gte("date", monday)
    .lte("date", addDays(monday, 6));
  if (error) throw new Error(`No se pudo cargar el menú: ${error.message}`);
  return data as unknown as PlanEntry[];
}

// Sugerencias de menú con Claude (Fase 4, adelantada). SOLO SERVIDOR.
// Rellena los huecos VACÍOS de una semana con recetas del usuario, aplicando los
// "Criterios de alimentación" del CLAUDE.md: prioridad vegetariana, variedad y no repetir
// platos de la semana ni de las semanas anteriores.
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { AI_MODEL, AiError, getAnthropic, toAiError } from "@/lib/ai";
import { addDays, dayLabel, today, weekDates } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { DISH_TYPE_LABELS, type DishType } from "@/types/recipe";
import { MEAL_LABELS, type Meal } from "@/types/plan";

// Semanas anteriores que se consultan para no repetir platos.
const HISTORY_WEEKS = 3;

// Una propuesta: poner esta receta en este hueco.
export type Suggestion = {
  date: string;
  meal: Meal;
  recipe_id: string;
  title: string;
  servings: number;
};

const SYSTEM_PROMPT = `Eres quien planifica el menú semanal de un recetario personal en España.
Tu tarea: asignar recetas del usuario a los huecos libres de una semana.

Criterios (por orden de importancia):
1. Usa SOLO recetas de la lista proporcionada (por su id) y SOLO los huecos libres indicados.
2. Prioridad vegetariana: la gran mayoría de los platos deben ser vegetarianos; los no vegetarianos, solo de forma ocasional.
3. No repitas una misma receta dentro de la semana (ni con los platos ya planificados) ni uses las de las semanas anteriores, salvo que no haya recetas suficientes: en ese caso, repite las que hace más tiempo que no se comen.
4. Variedad: evita repetir el mismo tipo de plato o el mismo ingrediente principal en días seguidos y en el mismo día.
5. Las cenas mejor ligeras (sopas y cremas, ensaladas, verdura, huevo); los platos más contundentes (legumbre, arroz, pasta), mejor en las comidas.
6. Puedes favorecer ligeramente las recetas favoritas.
Si hay más huecos que recetas utilizables, deja huecos sin asignar antes que romper el criterio 1.`;

// Genera la propuesta para los huecos vacíos de la semana. No guarda nada.
export async function suggestWeek(monday: string, meals: Meal[]): Promise<Suggestion[]> {
  const supabase = await createClient();

  // Datos necesarios: recetas, menú de esta semana y de las anteriores.
  const [recipesRes, planRes] = await Promise.all([
    supabase.from("recipes").select("id, title, servings, is_vegetarian, dish_type, main_ingredient, is_favorite"),
    supabase
      .from("meal_plan_entries")
      .select("date, meal, recipe_id, recipe:recipes (title)")
      .gte("date", addDays(monday, -7 * HISTORY_WEEKS))
      .lte("date", addDays(monday, 6)),
  ]);
  if (recipesRes.error || planRes.error) throw new AiError("No se han podido leer tus recetas.");
  const recipes = recipesRes.data;
  const plan = planRes.data as unknown as PlannedMeal[];
  if (recipes.length === 0) throw new AiError("Aún no tienes recetas para sugerir.");

  // Huecos libres: los de las comidas pedidas, sin plato, y no en días ya pasados.
  const todayIso = today();
  const weekPlan = plan.filter((e) => e.date >= monday);
  const freeSlots = weekDates(monday).flatMap((date) =>
    date < todayIso ? [] : meals.filter((meal) => !weekPlan.some((e) => e.date === date && e.meal === meal)).map((meal) => ({ date, meal })),
  );
  if (freeSlots.length === 0) throw new AiError("No hay huecos libres que rellenar en esta semana.");

  const history = plan.filter((e) => e.date < monday);
  return proposeAssignments({ recipes, weekPlan, history, freeSlots, meals });
}

// Datos de una receta que necesita Claude para decidir.
type RecipeFacts = {
  id: string;
  title: string;
  servings: number;
  is_vegetarian: boolean;
  dish_type: string | null;
  main_ingredient: string | null;
  is_favorite: boolean;
};
// Un plato ya planificado (esta semana o anteriores).
type PlannedMeal = { date: string; meal: Meal; recipe_id: string; recipe: { title: string } | null };

// Parte "pura" de IA: con los datos ya reunidos, pide a Claude la propuesta y la revisa.
// (Separada de la lectura de la base de datos para poder probarla con datos de ejemplo.)
export async function proposeAssignments({
  recipes,
  weekPlan,
  history,
  freeSlots,
  meals,
}: {
  recipes: RecipeFacts[];
  weekPlan: PlannedMeal[];
  history: PlannedMeal[];
  freeSlots: { date: string; meal: Meal }[];
  meals: Meal[];
}): Promise<Suggestion[]> {
  // Texto con toda la información para Claude.
  const recipeLines = recipes.map(
    (r) =>
      `- id=${r.id} | ${r.title} | ${r.is_vegetarian ? "vegetariana" : "NO vegetariana"} | tipo: ${
        r.dish_type ? DISH_TYPE_LABELS[r.dish_type as DishType] : "sin indicar"
      } | principal: ${r.main_ingredient ?? "sin indicar"}${r.is_favorite ? " | favorita" : ""}`,
  );
  const describe = (e: PlannedMeal) => `- ${dayLabel(e.date)} (${e.date}), ${MEAL_LABELS[e.meal].toLowerCase()}: ${e.recipe?.title ?? "?"}`;
  const userText = [
    `Recetas disponibles (${recipes.length}):`,
    ...recipeLines,
    "",
    `Ya planificado esta semana:`,
    ...(weekPlan.length ? weekPlan.map(describe) : ["- (nada)"]),
    "",
    `Comido en las ${HISTORY_WEEKS} semanas anteriores:`,
    ...(history.length ? [...history].sort((a, b) => a.date.localeCompare(b.date)).map(describe) : ["- (sin datos)"]),
    "",
    `Huecos libres a rellenar (${freeSlots.length}):`,
    ...freeSlots.map((s) => `- ${s.date} ${s.meal} (${dayLabel(s.date)})`),
  ].join("\n");

  // Esquema de la respuesta: solo se permiten ids de recetas existentes, fechas y huecos válidos.
  const Schema = z.object({
    assignments: z.array(
      z.object({
        date: z.enum(freeSlots.map((s) => s.date) as [string, ...string[]]),
        meal: z.enum(meals as [Meal, ...Meal[]]),
        recipe_id: z.enum(recipes.map((r) => r.id) as [string, ...string[]]),
      }),
    ),
  });

  let response;
  try {
    response = await getAnthropic().messages.parse({
      model: AI_MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userText }],
      output_config: { format: zodOutputFormat(Schema), effort: "medium" },
    });
  } catch (error) {
    throw toAiError(error);
  }
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new AiError("No se ha podido generar una sugerencia. Inténtalo de nuevo.");
  }

  // Revisión final: solo huecos libres de verdad, cada hueco una vez.
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const used = new Set<string>();
  const suggestions: Suggestion[] = [];
  for (const a of response.parsed_output.assignments) {
    const key = `${a.date}|${a.meal}`;
    const recipe = byId.get(a.recipe_id);
    if (!recipe || used.has(key) || !freeSlots.some((s) => s.date === a.date && s.meal === a.meal)) continue;
    used.add(key);
    suggestions.push({ date: a.date, meal: a.meal, recipe_id: recipe.id, title: recipe.title, servings: recipe.servings });
  }
  // Ordenadas por día y comida antes que cena.
  return suggestions.sort((x, y) => x.date.localeCompare(y.date) || (x.meal === "comida" ? -1 : 1));
}

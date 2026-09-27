// Tipos del menú semanal (tabla meal_plan_entries).
import type { DishType } from "@/types/recipe";

// Huecos de cada día. Para añadir otro (ej. "desayuno") hay que ampliarlo aquí y en el SQL.
export const MEALS = ["comida", "cena"] as const;
export type Meal = (typeof MEALS)[number];

export const MEAL_LABELS: Record<Meal, string> = {
  comida: "Comida",
  cena: "Cena",
};

// Una receta asignada a un hueco, con los datos de la receta que hacen falta para mostrarla.
export type PlanEntry = {
  id: string;
  date: string; // "AAAA-MM-DD"
  meal: Meal;
  servings: number;
  recipe: {
    id: string;
    title: string;
    photo_url: string | null;
    servings: number;
    is_vegetarian: boolean;
    dish_type: DishType | null;
  };
};

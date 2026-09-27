// Lista de la compra: lectura y cálculo de cantidades. SOLO SERVIDOR.
import { createClient } from "@/lib/supabase/server";
import type { Unit } from "@/types/recipe";
import type { ShoppingItem, ShoppingList, ShoppingSection } from "@/types/shopping";

// Lista de una semana (o null si todavía no se ha generado).
export async function getShoppingList(monday: string): Promise<ShoppingList | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shopping_lists")
    .select(
      `id, week_start,
       items:shopping_list_items (id, ingredient_id, custom_name, quantity, unit, shopping_section, is_checked,
         ingredient:ingredients (name))`,
    )
    .eq("week_start", monday)
    .maybeSingle();
  if (error) throw new Error(`No se pudo cargar la lista: ${error.message}`);
  if (!data) return null;

  type Row = {
    id: string;
    ingredient_id: string | null;
    custom_name: string | null;
    quantity: number | null;
    unit: Unit | null;
    shopping_section: ShoppingSection;
    is_checked: boolean;
    ingredient: { name: string } | null;
  };
  const items: ShoppingItem[] = (data.items as unknown as Row[]).map((row) => ({
    id: row.id,
    name: row.ingredient?.name ?? row.custom_name ?? "",
    ingredient_id: row.ingredient_id,
    quantity: row.quantity,
    unit: row.unit,
    shopping_section: row.shopping_section,
    is_checked: row.is_checked,
  }));
  return { id: data.id, week_start: data.week_start, items };
}

// ---- Suma de cantidades ----

// Unidad "base" para poder sumar: kg se pasa a g y l a ml (1,5 kg + 300 g = 1800 g).
// Devuelve la cantidad convertida y la unidad base.
export function toBaseUnit(quantity: number, unit: Unit | null): { quantity: number; unit: Unit | null } {
  if (unit === "kg") return { quantity: quantity * 1000, unit: "g" };
  if (unit === "l") return { quantity: quantity * 1000, unit: "ml" };
  return { quantity, unit };
}

// Una línea de ingrediente de una receta planificada, ya multiplicada por las raciones del menú.
export type NeededLine = {
  ingredient_id: string;
  quantity: number | null;
  unit: Unit | null;
};

// Suma las líneas del mismo ingrediente y misma unidad (base). Lo que no tiene cantidad
// ("sal al gusto") queda como una única línea sin cantidad (si no hay ya otra con cantidad).
export function sumLines(lines: NeededLine[]): NeededLine[] {
  const totals = new Map<string, NeededLine>();
  for (const line of lines) {
    if (line.quantity == null) continue;
    const base = toBaseUnit(line.quantity, line.unit);
    const key = `${line.ingredient_id}|${base.unit ?? ""}`;
    const current = totals.get(key);
    if (current) current.quantity = (current.quantity ?? 0) + base.quantity;
    else totals.set(key, { ingredient_id: line.ingredient_id, quantity: base.quantity, unit: base.unit });
  }
  // Ingredientes sin cantidad que no aparecen ya con cantidad.
  for (const line of lines) {
    if (line.quantity != null) continue;
    const alreadyListed = [...totals.values()].some((t) => t.ingredient_id === line.ingredient_id);
    if (!alreadyListed) totals.set(`${line.ingredient_id}|-`, { ingredient_id: line.ingredient_id, quantity: null, unit: null });
  }
  return [...totals.values()];
}

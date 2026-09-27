"use server";
// Acciones del servidor de la lista de la compra.
// Todas comprueban la sesión; RLS impide además tocar listas ajenas.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { addDays, isIsoDate, mondayOf } from "@/lib/dates";
import { classifyIngredients } from "@/lib/sections";
import { sumLines, type NeededLine } from "@/lib/shopping";
import type { Unit } from "@/types/recipe";
import { SECTIONS, type ShoppingSection } from "@/types/shopping";

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) throw new Error("No has iniciado sesión.");
  return { supabase, userId };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Devuelve el id de la lista de esa semana, creándola si no existe.
async function ensureList(supabase: Supabase, userId: string, monday: string): Promise<string> {
  const { data, error } = await supabase
    .from("shopping_lists")
    .upsert({ user_id: userId, week_start: monday }, { onConflict: "user_id,week_start" })
    .select("id")
    .single();
  if (error || !data) throw new Error("No se ha podido crear la lista.");
  return data.id as string;
}

// Genera (o regenera) la lista de la semana a partir del menú planificado.
//  - Suma cantidades del mismo ingrediente y unidad, ajustadas a las raciones del menú.
//  - Los ingredientes que siguen en "otros" se clasifican con Claude (y se guarda en el catálogo).
//  - Conserva los artículos añadidos a mano y lo que ya estaba marcado como comprado.
export async function generateList(mondayInput: string) {
  if (!isIsoDate(mondayInput)) throw new Error("Semana no válida.");
  const monday = mondayOf(mondayInput);
  const { supabase, userId } = await requireUser();

  // 1. Platos de la semana con los ingredientes de cada receta.
  const { data: entries, error } = await supabase
    .from("meal_plan_entries")
    .select("servings, recipe:recipes (servings, lines:recipe_ingredients (ingredient_id, quantity, unit))")
    .gte("date", monday)
    .lte("date", addDays(monday, 6));
  if (error) throw new Error("No se ha podido leer el menú.");
  if (!entries || entries.length === 0) throw new Error("No hay platos en el menú de esta semana.");

  // 2. Cada ingrediente multiplicado por (raciones del menú / raciones de la receta).
  type Entry = {
    servings: number;
    recipe: { servings: number; lines: { ingredient_id: string; quantity: number | null; unit: Unit | null }[] } | null;
  };
  const needed: NeededLine[] = [];
  for (const entry of entries as unknown as Entry[]) {
    if (!entry.recipe) continue;
    const factor = entry.servings / entry.recipe.servings;
    for (const line of entry.recipe.lines) {
      needed.push({
        ingredient_id: line.ingredient_id,
        quantity: line.quantity != null ? line.quantity * factor : null,
        unit: line.unit,
      });
    }
  }
  const totals = sumLines(needed);

  // 3. Secciones: las del catálogo; las que sigan en "otros" se clasifican ahora con Claude.
  const ingredientIds = [...new Set(totals.map((t) => t.ingredient_id))];
  const { data: ingredients } = ingredientIds.length
    ? await supabase.from("ingredients").select("id, name, shopping_section").in("id", ingredientIds)
    : { data: [] };
  const sectionOf = new Map<string, ShoppingSection>();
  for (const ing of ingredients ?? []) sectionOf.set(ing.id, ing.shopping_section as ShoppingSection);

  const unclassified = (ingredients ?? []).filter((i) => i.shopping_section === "otros");
  if (unclassified.length > 0) {
    const classified = await classifyIngredients(unclassified.map((i) => i.name as string));
    for (const ing of unclassified) {
      const section = classified.get(ing.name);
      if (section && section !== "otros") {
        sectionOf.set(ing.id, section);
        await supabase.from("ingredients").update({ shopping_section: section }).eq("id", ing.id);
      }
    }
  }

  // 4. Lista de la semana: recordamos qué estaba marcado y rehacemos la parte generada.
  const listId = await ensureList(supabase, userId, monday);
  const { data: previous } = await supabase
    .from("shopping_list_items")
    .select("ingredient_id, unit, is_checked")
    .eq("list_id", listId)
    .not("ingredient_id", "is", null);
  const checked = new Set(
    (previous ?? []).filter((p) => p.is_checked).map((p) => `${p.ingredient_id}|${p.unit ?? ""}`),
  );

  const { error: delError } = await supabase
    .from("shopping_list_items")
    .delete()
    .eq("list_id", listId)
    .not("ingredient_id", "is", null);
  if (delError) throw new Error("No se ha podido actualizar la lista.");

  if (totals.length > 0) {
    const { error: insError } = await supabase.from("shopping_list_items").insert(
      totals.map((t) => ({
        list_id: listId,
        ingredient_id: t.ingredient_id,
        // Redondeo a 2 decimales para no arrastrar decimales raros de las multiplicaciones.
        quantity: t.quantity != null ? Math.round(t.quantity * 100) / 100 : null,
        unit: t.unit,
        shopping_section: sectionOf.get(t.ingredient_id) ?? "otros",
        is_checked: checked.has(`${t.ingredient_id}|${t.unit ?? ""}`),
      })),
    );
    if (insError) throw new Error("No se ha podido guardar la lista.");
  }
  revalidatePath("/lista");
}

// Marca o desmarca un artículo como comprado.
export async function setItemChecked(id: string, isChecked: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("shopping_list_items").update({ is_checked: isChecked }).eq("id", id);
  if (error) throw new Error("No se ha podido marcar.");
  revalidatePath("/lista");
}

// Añade un artículo escrito a mano ("papel de cocina", "2 l de leche"…).
export async function addManualItem(mondayInput: string, name: string, section: ShoppingSection) {
  if (!isIsoDate(mondayInput)) throw new Error("Semana no válida.");
  const text = name.trim();
  if (!text) throw new Error("Escribe qué quieres añadir.");
  const { supabase, userId } = await requireUser();
  const listId = await ensureList(supabase, userId, mondayOf(mondayInput));
  const { error } = await supabase.from("shopping_list_items").insert({
    list_id: listId,
    custom_name: text,
    shopping_section: SECTIONS.includes(section) ? section : "otros",
  });
  if (error) throw new Error("No se ha podido añadir.");
  revalidatePath("/lista");
}

// Cambia la sección de un artículo. Si viene de un ingrediente, se recuerda en el catálogo
// para las próximas listas.
export async function setItemSection(id: string, section: ShoppingSection) {
  if (!SECTIONS.includes(section)) throw new Error("Sección no válida.");
  const { supabase } = await requireUser();
  const { data: item, error } = await supabase
    .from("shopping_list_items")
    .update({ shopping_section: section })
    .eq("id", id)
    .select("ingredient_id")
    .single();
  if (error) throw new Error("No se ha podido cambiar la sección.");
  if (item?.ingredient_id) {
    await supabase.from("ingredients").update({ shopping_section: section }).eq("id", item.ingredient_id);
  }
  revalidatePath("/lista");
}

// Quita un artículo de la lista.
export async function deleteItem(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("shopping_list_items").delete().eq("id", id);
  if (error) throw new Error("No se ha podido quitar.");
  revalidatePath("/lista");
}

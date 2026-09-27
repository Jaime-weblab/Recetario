// Tipos de la lista de la compra y secciones del súper.
import type { Unit } from "@/types/recipe";

// Secciones del súper, en el orden en que se recorren (y se muestran en la lista).
export const SECTIONS = ["fruteria", "carniceria", "pescaderia", "lacteos", "despensa", "congelados", "otros"] as const;
export type ShoppingSection = (typeof SECTIONS)[number];

export const SECTION_LABELS: Record<ShoppingSection, string> = {
  fruteria: "Frutería",
  carniceria: "Carnicería",
  pescaderia: "Pescadería",
  lacteos: "Lácteos y huevos",
  despensa: "Despensa",
  congelados: "Congelados",
  otros: "Otros",
};

// Artículo de la lista, tal como se muestra.
export type ShoppingItem = {
  id: string;
  name: string; // nombre del ingrediente o texto escrito a mano
  ingredient_id: string | null; // null = añadido a mano
  quantity: number | null;
  unit: Unit | null;
  shopping_section: ShoppingSection;
  is_checked: boolean;
};

// Lista de una semana.
export type ShoppingList = {
  id: string;
  week_start: string;
  items: ShoppingItem[];
};

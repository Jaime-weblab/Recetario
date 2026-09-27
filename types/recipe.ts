// Tipos de datos de las recetas (reflejan las tablas de supabase/migrations/…_recipes.sql)
// y listas fijas (unidades, tipos de plato) con sus textos en español para la interfaz.

// ---- Unidades permitidas (mismas que en la base de datos) ----
export const UNITS = ["g", "kg", "ml", "l", "ud", "cda", "cdta", "pizca"] as const;
export type Unit = (typeof UNITS)[number];

// Texto que se muestra en el desplegable de unidades.
export const UNIT_LABELS: Record<Unit, string> = {
  g: "g",
  kg: "kg",
  ml: "ml",
  l: "l",
  ud: "ud",
  cda: "cda",
  cdta: "cdta",
  pizca: "pizca",
};

// ---- Tipos de plato (sirven para filtrar y para variar el menú) ----
export const DISH_TYPES = [
  "legumbre", "pasta", "arroz", "verdura", "huevo",
  "pescado", "carne", "sopa", "ensalada", "otro",
] as const;
export type DishType = (typeof DISH_TYPES)[number];

export const DISH_TYPE_LABELS: Record<DishType, string> = {
  legumbre: "Legumbre",
  pasta: "Pasta",
  arroz: "Arroz",
  verdura: "Verdura",
  huevo: "Huevo",
  pescado: "Pescado",
  carne: "Carne",
  sopa: "Sopa o crema",
  ensalada: "Ensalada",
  otro: "Otro",
};

// ---- Filas tal como vienen de la base de datos ----

// Receta (tabla recipes).
export type Recipe = {
  id: string;
  title: string;
  description: string | null;
  servings: number;
  prep_minutes: number | null;
  cook_minutes: number | null;
  tags: string[];
  is_vegetarian: boolean;
  main_ingredient: string | null;
  dish_type: DishType | null;
  photo_url: string | null;
  source_url: string | null;
  notes: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
};

// Una línea de ingredientes de una receta, con el nombre del ingrediente ya unido.
export type RecipeIngredientLine = {
  id: string;
  quantity: number | null;
  unit: Unit | null;
  note: string | null;
  position: number;
  ingredient: { id: string; name: string };
};

// Un paso de la receta.
export type RecipeStep = {
  id: string;
  position: number;
  text: string;
};

// Receta completa para la ficha: datos + ingredientes + pasos (ya ordenados).
export type RecipeWithDetails = Recipe & {
  ingredients: RecipeIngredientLine[];
  steps: RecipeStep[];
};

// ---- Datos que envía el formulario (y que producirá la importación de la Fase 1B) ----
// Es "plano" y sencillo a propósito: los ingredientes van por NOMBRE (no por id);
// el servidor se encarga de buscarlos o crearlos en el catálogo.
export type RecipeInput = {
  title: string;
  description: string;
  servings: number;
  prep_minutes: number | null;
  cook_minutes: number | null;
  tags: string[];
  is_vegetarian: boolean;
  main_ingredient: string;
  dish_type: DishType | null;
  photo_url: string | null;
  source_url: string;
  notes: string;
  ingredients: {
    name: string;
    quantity: number | null;
    unit: Unit | null;
    note: string;
  }[];
  steps: string[];
};

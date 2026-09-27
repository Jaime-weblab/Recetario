"use client";
// Listado de recetas con buscador y filtros, todo instantáneo en el propio móvil.
// Recibe TODAS las recetas del servidor y decide aquí cuáles mostrar.
// Los filtros se guardan en la dirección (?q=…&tipo=…) para que sigan puestos al volver atrás.
import { useMemo, useState } from "react";
import RecipeCard from "@/components/RecipeCard";
import { LeafIcon, StarIcon } from "@/components/icons";
import { DISH_TYPES, DISH_TYPE_LABELS, type DishType, type RecipeListItem } from "@/types/recipe";

// Filtros activos. Se leen de / escriben en la dirección de la página.
export type RecipeFilters = {
  q: string; // texto buscado
  favorites: boolean;
  vegetarian: boolean;
  dishType: DishType | null;
  tag: string | null;
};

// Pasa a minúsculas y quita acentos: "Calabacín" → "calabacin".
function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// ¿Cumple la receta todos los filtros?
function matches(recipe: RecipeListItem, f: RecipeFilters): boolean {
  if (f.favorites && !recipe.is_favorite) return false;
  if (f.vegetarian && !recipe.is_vegetarian) return false;
  if (f.dishType && recipe.dish_type !== f.dishType) return false;
  if (f.tag && !recipe.tags.includes(f.tag)) return false;
  if (f.q.trim()) {
    // Buscamos en título, ingrediente principal, etiquetas e ingredientes.
    const haystack = normalize(
      [recipe.title, recipe.main_ingredient ?? "", ...recipe.tags, ...recipe.ingredient_names].join(" "),
    );
    // Todas las palabras buscadas deben aparecer ("lentejas curry" → las dos).
    return normalize(f.q).split(/\s+/).filter(Boolean).every((word) => haystack.includes(word));
  }
  return true;
}

// Escribe los filtros en la dirección sin recargar la página (replaceState no añade historial).
function saveToUrl(f: RecipeFilters) {
  const params = new URLSearchParams();
  if (f.q.trim()) params.set("q", f.q.trim());
  if (f.favorites) params.set("fav", "1");
  if (f.vegetarian) params.set("veg", "1");
  if (f.dishType) params.set("tipo", f.dishType);
  if (f.tag) params.set("etiqueta", f.tag);
  const query = params.toString();
  window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
}

export default function RecipeList({
  recipes,
  initialFilters,
}: {
  recipes: RecipeListItem[];
  initialFilters: RecipeFilters;
}) {
  const [filters, setFilters] = useState<RecipeFilters>(initialFilters);

  // Cambia uno o varios filtros y lo refleja en la dirección.
  const update = (patch: Partial<RecipeFilters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    saveToUrl(next);
  };

  // Solo ofrecemos los tipos de plato y etiquetas que tienen alguna receta.
  const dishTypes = useMemo(
    () => DISH_TYPES.filter((t) => recipes.some((r) => r.dish_type === t)),
    [recipes],
  );
  const tags = useMemo(
    () => [...new Set(recipes.flatMap((r) => r.tags))].sort((a, b) => a.localeCompare(b, "es")),
    [recipes],
  );

  const visible = recipes.filter((r) => matches(r, filters));
  const anyFilter =
    filters.q.trim() !== "" || filters.favorites || filters.vegetarian || filters.dishType !== null || filters.tag !== null;

  return (
    <div className="mt-4">
      {/* Buscador */}
      <input
        type="search"
        inputMode="search"
        placeholder="Buscar por nombre o ingrediente"
        value={filters.q}
        onChange={(e) => update({ q: e.target.value })}
        className="h-11 w-full rounded-control border border-line bg-surface px-3 text-base outline-none focus:border-accent"
      />

      {/* Botones de filtro: fila que se desliza en horizontal si no cabe */}
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <Chip active={filters.favorites} onClick={() => update({ favorites: !filters.favorites })}>
          <StarIcon filled={filters.favorites} className="size-4" />
          Favoritas
        </Chip>
        <Chip active={filters.vegetarian} onClick={() => update({ vegetarian: !filters.vegetarian })}>
          <LeafIcon className="size-4" />
          Vegetarianas
        </Chip>
        {dishTypes.map((t) => (
          <Chip key={t} active={filters.dishType === t} onClick={() => update({ dishType: filters.dishType === t ? null : t })}>
            {DISH_TYPE_LABELS[t]}
          </Chip>
        ))}
      </div>

      {/* Etiquetas (segunda fila, solo si hay) */}
      {tags.length > 0 && (
        <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {tags.map((tag) => (
            <Chip key={tag} active={filters.tag === tag} onClick={() => update({ tag: filters.tag === tag ? null : tag })}>
              #{tag}
            </Chip>
          ))}
        </div>
      )}

      {/* Resultado */}
      {visible.length === 0 ? (
        <div className="mt-10 text-center">
          <p className="font-serif text-xl">Ninguna receta coincide</p>
          <button
            type="button"
            onClick={() => update({ q: "", favorites: false, vegetarian: false, dishType: null, tag: null })}
            className="mt-4 h-11 rounded-control border border-line px-5 text-sm"
          >
            Quitar filtros
          </button>
        </div>
      ) : (
        <>
          {anyFilter && (
            <p className="mt-3 text-sm text-muted">
              {visible.length} {visible.length === 1 ? "receta" : "recetas"}
            </p>
          )}
          <ul className="mt-3 flex flex-col gap-3">
            {visible.map((recipe) => (
              <li key={recipe.id}>
                <RecipeCard recipe={recipe} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// Botón de filtro con forma de etiqueta; relleno en color principal cuando está activo.
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-11 shrink-0 items-center gap-1.5 rounded-control border px-3 text-sm whitespace-nowrap ${
        active ? "border-accent bg-accent text-on-accent" : "border-line bg-surface text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

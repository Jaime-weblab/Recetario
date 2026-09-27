"use client";
// Selector de recetas para asignar a un hueco del menú: buscador + lista
// (vegetarianas primero, favoritas marcadas). Al tocar una receta se llama a `onPick`.
import { useState } from "react";
import Link from "next/link";
import { LeafIcon, StarIcon } from "@/components/icons";
import { RecipeThumb } from "@/components/RecipeCard";
import type { RecipeListItem } from "@/types/recipe";

// Minúsculas y sin acentos, para buscar "calabacin" y encontrar "Calabacín".
const normalize = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function RecipePicker({
  recipes,
  onPick,
  disabled = false,
}: {
  recipes: RecipeListItem[];
  onPick: (recipe: RecipeListItem) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");

  const words = normalize(query).split(/\s+/).filter(Boolean);
  const visible = recipes.filter((r) => {
    if (words.length === 0) return true;
    const haystack = normalize([r.title, r.main_ingredient ?? "", ...r.tags, ...r.ingredient_names].join(" "));
    return words.every((w) => haystack.includes(w));
  });

  if (recipes.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-muted">Aún no tienes recetas.</p>
        <Link href="/recetas/nueva" className="mt-3 inline-flex h-11 items-center text-accent underline">
          Crear una receta
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        placeholder="Buscar por nombre o ingrediente"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-11 w-full rounded-control border border-line bg-surface px-3 text-base outline-none focus:border-accent"
      />
      {visible.length === 0 && <p className="py-4 text-center text-sm text-muted">Ninguna receta coincide.</p>}
      <ul className="flex flex-col gap-2">
        {visible.map((recipe) => (
          <li key={recipe.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(recipe)}
              className="flex w-full items-center gap-3 rounded-card border border-line bg-surface p-2 text-left active:opacity-70 disabled:opacity-50"
            >
              <RecipeThumb photoUrl={recipe.photo_url} className="size-12" />
              <span className="min-w-0 flex-1 font-serif leading-snug">{recipe.title}</span>
              {recipe.is_favorite && <StarIcon filled className="size-4 shrink-0 text-highlight" />}
              {recipe.is_vegetarian && <LeafIcon className="size-4 shrink-0 text-accent" />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Listado de recetas (vegetarianas primero). La búsqueda y los filtros llegan en la parte 5.
import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import RecipeCard from "@/components/RecipeCard";
import { PlusIcon } from "@/components/icons";
import { listRecipes } from "@/lib/recipes";

export const metadata: Metadata = { title: "Recetas" };

export default async function RecipesPage() {
  const recipes = await listRecipes();

  return (
    <>
      <PageHeader
        title="Recetas"
        action={
          <Link
            href="/recetas/nueva"
            aria-label="Nueva receta"
            className="flex size-11 items-center justify-center rounded-control bg-accent text-on-accent"
          >
            <PlusIcon className="size-6" />
          </Link>
        }
      />

      {recipes.length === 0 ? (
        // Estado vacío: invitación a crear la primera receta.
        <div className="mt-10 text-center">
          <p className="font-serif text-xl">Empieza tu recetario</p>
          <p className="mt-1 text-sm text-muted">Guarda tu primera receta para verla aquí.</p>
          <Link
            href="/recetas/nueva"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-control bg-accent px-5 font-semibold text-on-accent"
          >
            <PlusIcon className="size-4" />
            Nueva receta
          </Link>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <RecipeCard recipe={recipe} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

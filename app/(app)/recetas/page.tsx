// Listado de recetas (vegetarianas primero) con buscador y filtros.
// Aquí solo cargamos los datos; el filtrado ocurre al instante en components/RecipeList.
import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import RecipeList, { type RecipeFilters } from "@/components/RecipeList";
import { PlusIcon } from "@/components/icons";
import { listRecipes } from "@/lib/recipes";
import { DISH_TYPES, type DishType } from "@/types/recipe";

export const metadata: Metadata = { title: "Recetas" };

// Lee los filtros de la dirección (?q=…&fav=1&veg=1&tipo=…&etiqueta=…).
function filtersFromParams(params: Record<string, string | string[] | undefined>): RecipeFilters {
  const get = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const tipo = get("tipo");
  return {
    q: get("q"),
    favorites: get("fav") === "1",
    vegetarian: get("veg") === "1",
    dishType: DISH_TYPES.includes(tipo as DishType) ? (tipo as DishType) : null,
    tag: get("etiqueta") || null,
  };
}

export default async function RecipesPage({ searchParams }: PageProps<"/recetas">) {
  const [recipes, params] = await Promise.all([listRecipes(), searchParams]);

  return (
    <>
      <PageHeader
        title="Recetas"
        action={
          <div className="flex gap-2">
            {/* Importar desde web o fotos (Fase 1B) */}
            <Link
              href="/recetas/importar"
              className="flex h-11 items-center rounded-control border border-accent px-3 text-sm font-medium text-accent"
            >
              Importar
            </Link>
            <Link
              href="/recetas/nueva"
              aria-label="Nueva receta"
              className="flex size-11 items-center justify-center rounded-control bg-accent text-on-accent"
            >
              <PlusIcon className="size-6" />
            </Link>
          </div>
        }
      />

      {recipes.length === 0 ? (
        // Estado vacío: invitación a crear la primera receta.
        <div className="mt-10 text-center">
          <p className="font-serif text-xl">Empieza tu recetario</p>
          <p className="mt-1 text-sm text-muted">Guarda tu primera receta para verla aquí.</p>
          <div className="mt-6 flex justify-center gap-2">
            <Link
              href="/recetas/nueva"
              className="inline-flex h-11 items-center gap-2 rounded-control bg-accent px-5 font-semibold text-on-accent"
            >
              <PlusIcon className="size-4" />
              Nueva receta
            </Link>
            <Link
              href="/recetas/importar"
              className="inline-flex h-11 items-center rounded-control border border-accent px-5 font-semibold text-accent"
            >
              Importar
            </Link>
          </div>
        </div>
      ) : (
        <RecipeList recipes={recipes} initialFilters={filtersFromParams(params)} />
      )}

      {/* Enlace discreto a la cuenta (contraseña, cerrar sesión) */}
      <div className="mt-8 text-center">
        <Link href="/cuenta" className="inline-flex h-11 items-center px-4 text-sm text-muted underline">
          Cuenta y contraseña
        </Link>
      </div>
    </>
  );
}

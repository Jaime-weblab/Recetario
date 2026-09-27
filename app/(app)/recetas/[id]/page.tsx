// Ficha de una receta: foto, datos, ingredientes, pasos y acciones (editar, borrar, favorita).
// El selector de raciones que recalcula cantidades llega en la parte 6.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DeleteRecipeButton from "@/components/DeleteRecipeButton";
import FavoriteButton from "@/components/FavoriteButton";
import { ChevronLeftIcon, ClockIcon, LeafIcon } from "@/components/icons";
import { getRecipe } from "@/lib/recipes";
import { formatMinutes, formatQuantity } from "@/lib/units";
import { DISH_TYPE_LABELS } from "@/types/recipe";

// El título de la pestaña es el de la receta.
export async function generateMetadata({ params }: PageProps<"/recetas/[id]">): Promise<Metadata> {
  const { id } = await params;
  const recipe = await getRecipe(id);
  return { title: recipe?.title ?? "Receta" };
}

export default async function RecipePage({ params }: PageProps<"/recetas/[id]">) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  const sectionTitle = "mb-3 border-b border-line pb-1 font-serif text-lg italic text-muted";

  return (
    <article className="pb-8">
      {/* Volver al listado */}
      <Link href="/recetas" className="-ml-2 flex h-11 w-fit items-center pr-3 text-sm text-muted">
        <ChevronLeftIcon className="size-5" />
        Recetas
      </Link>

      {recipe.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element -- fotos ya redimensionadas al subirlas
        <img src={recipe.photo_url} alt="" className="mb-4 aspect-[4/3] w-full rounded-card object-cover" />
      )}

      {/* Título + estrella */}
      <div className="flex items-start gap-2">
        <h1 className="flex-1 font-serif text-3xl leading-tight">{recipe.title}</h1>
        <FavoriteButton id={recipe.id} isFavorite={recipe.is_favorite} />
      </div>

      {/* Datos rápidos */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <span>{recipe.servings} {recipe.servings === 1 ? "ración" : "raciones"}</span>
        {recipe.prep_minutes != null && recipe.prep_minutes > 0 && (
          <span className="flex items-center gap-1"><ClockIcon className="size-4" />Prep. {formatMinutes(recipe.prep_minutes)}</span>
        )}
        {recipe.cook_minutes != null && recipe.cook_minutes > 0 && (
          <span>Cocción {formatMinutes(recipe.cook_minutes)}</span>
        )}
        {recipe.dish_type && <span>{DISH_TYPE_LABELS[recipe.dish_type]}</span>}
        {recipe.is_vegetarian && (
          <span className="flex items-center gap-1 text-accent"><LeafIcon className="size-4" />Vegetariana</span>
        )}
      </div>

      {recipe.description && <p className="mt-4">{recipe.description}</p>}

      {/* Ingredientes: cantidad a la izquierda, nombre (y nota) a la derecha */}
      {recipe.ingredients.length > 0 && (
        <section className="mt-8">
          <h2 className={sectionTitle}>Ingredientes</h2>
          <ul className="flex flex-col">
            {recipe.ingredients.map((line) => (
              <li key={line.id} className="flex gap-3 border-b border-line/60 py-2 last:border-0">
                <span className="w-20 shrink-0 text-right font-medium">
                  {formatQuantity(line.quantity, line.unit)}
                </span>
                <span>
                  {line.ingredient.name}
                  {line.note && <span className="text-muted">, {line.note}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Pasos numerados */}
      {recipe.steps.length > 0 && (
        <section className="mt-8">
          <h2 className={sectionTitle}>Pasos</h2>
          <ol className="flex flex-col gap-4">
            {recipe.steps.map((step, index) => (
              <li key={step.id} className="flex gap-3">
                <span className="w-6 shrink-0 text-right font-serif text-lg leading-6 text-accent">{index + 1}</span>
                <p className="whitespace-pre-line">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {recipe.notes && (
        <section className="mt-8">
          <h2 className={sectionTitle}>Notas</h2>
          <p className="whitespace-pre-line">{recipe.notes}</p>
        </section>
      )}

      {/* Etiquetas y enlace de origen */}
      {(recipe.tags.length > 0 || recipe.source_url) && (
        <div className="mt-8 flex flex-col gap-3 text-sm">
          {recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {recipe.tags.map((tag) => (
                <span key={tag} className="rounded-control border border-line px-2 py-1 text-muted">{tag}</span>
              ))}
            </div>
          )}
          {recipe.source_url && (
            <a href={recipe.source_url} target="_blank" rel="noopener noreferrer" className="break-all text-accent underline">
              Ver receta original
            </a>
          )}
        </div>
      )}

      {/* Acciones */}
      <div className="mt-10 flex gap-3">
        <Link
          href={`/recetas/${recipe.id}/editar`}
          className="flex h-11 flex-1 items-center justify-center rounded-control border border-line bg-surface text-sm"
        >
          Editar
        </Link>
        <DeleteRecipeButton id={recipe.id} title={recipe.title} />
      </div>
    </article>
  );
}

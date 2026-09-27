// Tarjeta de una receta en el listado (estilo "Cuaderno"):
// foto cuadrada a la izquierda; título y datos a la derecha. Toda la tarjeta es un enlace a la ficha.
import Link from "next/link";
import { BowlIcon, ClockIcon, LeafIcon, StarIcon } from "@/components/icons";
import { formatMinutes } from "@/lib/units";
import { DISH_TYPE_LABELS, type Recipe } from "@/types/recipe";

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  const totalMinutes = (recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0);

  return (
    <Link
      href={`/recetas/${recipe.id}`}
      className="flex items-center gap-3 rounded-card border border-line bg-surface p-2.5 active:opacity-70"
    >
      <RecipeThumb photoUrl={recipe.photo_url} className="size-20" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1">
          <h2 className="flex-1 font-serif text-lg leading-snug">{recipe.title}</h2>
          {recipe.is_favorite && <StarIcon filled className="mt-1 size-4 shrink-0 text-highlight" />}
        </div>
        {/* Línea de datos: tiempo total · tipo de plato · vegetariana */}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {totalMinutes > 0 && (
            <span className="flex items-center gap-1">
              <ClockIcon className="size-3.5" />
              {formatMinutes(totalMinutes)}
            </span>
          )}
          {recipe.dish_type && <span>{DISH_TYPE_LABELS[recipe.dish_type]}</span>}
          {recipe.is_vegetarian && (
            <span className="flex items-center gap-1 text-accent">
              <LeafIcon className="size-3.5" />
              Vegetariana
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// Miniatura cuadrada: la foto de la receta o, si no tiene, un cuenco dibujado.
export function RecipeThumb({ photoUrl, className }: { photoUrl: string | null; className?: string }) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- fotos ya redimensionadas al subirlas
      <img src={photoUrl} alt="" className={`shrink-0 rounded-control object-cover ${className}`} />
    );
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-control bg-accent/10 text-accent ${className}`}
    >
      <BowlIcon className="size-7" />
    </div>
  );
}

"use client";
// Ingredientes de la ficha con selector de raciones (− N +).
// Al cambiar las raciones, todas las cantidades se multiplican en proporción
// (y se pasan a kg / l cuando conviene, ver lib/units.ts). No se guarda nada: es solo para cocinar.
import { useState } from "react";
import { formatQuantity } from "@/lib/units";
import type { RecipeIngredientLine } from "@/types/recipe";

export default function ScaledIngredients({
  baseServings,
  lines,
}: {
  baseServings: number; // raciones con las que está escrita la receta
  lines: RecipeIngredientLine[];
}) {
  const [servings, setServings] = useState(baseServings);
  const factor = servings / baseServings;

  return (
    <div>
      {/* Selector de raciones */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-muted">
          {servings === baseServings ? "Raciones" : `Raciones (receta original: ${baseServings})`}
        </span>
        <div className="flex h-11 items-center rounded-control border border-line bg-surface">
          <button
            type="button"
            aria-label="Menos raciones"
            onClick={() => setServings((s) => Math.max(1, s - 1))}
            className="h-full w-11 text-lg text-muted"
          >
            −
          </button>
          <span className="w-8 text-center font-medium" aria-live="polite">{servings}</span>
          <button
            type="button"
            aria-label="Más raciones"
            onClick={() => setServings((s) => s + 1)}
            className="h-full w-11 text-lg text-muted"
          >
            +
          </button>
        </div>
      </div>

      {/* Lista: cantidad (ya escalada) a la izquierda, nombre y nota a la derecha */}
      <ul className="flex flex-col">
        {lines.map((line) => (
          <li key={line.id} className="flex gap-3 border-b border-line/60 py-2 last:border-0">
            <span className="w-20 shrink-0 text-right font-medium">
              {formatQuantity(line.quantity, line.unit, factor)}
            </span>
            <span>
              {line.ingredient.name}
              {line.note && <span className="text-muted">, {line.note}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

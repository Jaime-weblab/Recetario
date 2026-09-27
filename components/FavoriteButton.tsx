"use client";
// Botón de estrella para marcar/desmarcar una receta como favorita.
// Cambia al instante en pantalla (sin esperar al servidor) y lo guarda en segundo plano.
import { useOptimistic, useTransition } from "react";
import { StarIcon } from "@/components/icons";
import { setFavorite } from "@/app/(app)/recetas/actions";

export default function FavoriteButton({ id, isFavorite }: { id: string; isFavorite: boolean }) {
  const [, startTransition] = useTransition();
  // Valor "optimista": se ve el cambio ya; si el servidor fallara, vuelve al valor real.
  const [favorite, setOptimistic] = useOptimistic(isFavorite);

  return (
    <button
      type="button"
      aria-label={favorite ? "Quitar de favoritas" : "Marcar como favorita"}
      aria-pressed={favorite}
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!favorite);
          await setFavorite(id, !favorite);
        })
      }
      className={`flex size-11 shrink-0 items-center justify-center ${favorite ? "text-highlight" : "text-muted"}`}
    >
      <StarIcon filled={favorite} className="size-6" />
    </button>
  );
}

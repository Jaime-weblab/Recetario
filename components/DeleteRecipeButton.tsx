"use client";
// Botón para borrar una receta. Pide confirmación antes, porque no se puede deshacer.
import { useTransition } from "react";
import { TrashIcon } from "@/components/icons";
import { deleteRecipe } from "@/app/(app)/recetas/actions";

export default function DeleteRecipeButton({ id, title }: { id: string; title: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`¿Borrar "${title}"? No se puede deshacer.`)) return;
        startTransition(() => deleteRecipe(id));
      }}
      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-control border border-red-600/40 text-sm text-red-700 disabled:opacity-50 dark:text-red-400"
    >
      <TrashIcon className="size-4" />
      {pending ? "Borrando…" : "Borrar"}
    </button>
  );
}

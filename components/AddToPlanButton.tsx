"use client";
// Botón "Añadir al menú" de la ficha de receta: abre una hoja con la semana (se puede cambiar
// de semana con ‹ ›) y al tocar un hueco pone ahí la receta. Si el hueco está ocupado, pide confirmación.
import { useState, useTransition } from "react";
import BottomSheet from "@/components/BottomSheet";
import WeekSlotList from "@/components/WeekSlotList";
import { ChevronLeftIcon } from "@/components/icons";
import { assignRecipe, fetchWeekPlan } from "@/app/(app)/plan-actions";
import { addDays, dayLabel, mondayOf, today, weekLabel } from "@/lib/dates";
import { MEAL_LABELS, type Meal, type PlanEntry } from "@/types/plan";

export default function AddToPlanButton({ recipeId, servings }: { recipeId: string; servings: number }) {
  const [open, setOpen] = useState(false);
  const [monday, setMonday] = useState(() => mondayOf(today()));
  const [entries, setEntries] = useState<PlanEntry[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Muestra una semana y carga su menú (para ver qué huecos están libres).
  function showWeek(week: string) {
    setMonday(week);
    setEntries(null);
    fetchWeekPlan(week)
      .then(setEntries)
      .catch(() => setError("No se ha podido cargar el menú."));
  }

  function pick(date: string, meal: Meal, occupant: PlanEntry | undefined) {
    if (occupant?.recipe.id === recipeId) return; // ya está ahí
    if (occupant && !confirm(`Se sustituirá "${occupant.recipe.title}". ¿Continuar?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await assignRecipe(date, meal, recipeId, servings);
        setOpen(false);
        setMessage(`Añadida al ${dayLabel(date)}, ${MEAL_LABELS[meal].toLowerCase()}.`);
      } catch {
        setError("No se ha podido añadir al menú.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMessage(null);
          setError(null);
          setOpen(true);
          showWeek(monday);
        }}
        className="h-11 w-full rounded-control bg-accent font-semibold text-on-accent"
      >
        Añadir al menú
      </button>
      {message && <p className="mt-2 text-center text-sm text-accent">{message}</p>}

      {open && (
        <BottomSheet title="Añadir al menú" onClose={() => setOpen(false)}>
          {/* Cambiar de semana */}
          <div className="mb-3 flex items-center justify-between">
            <button type="button" aria-label="Semana anterior" onClick={() => showWeek(addDays(monday, -7))} className="flex size-11 items-center justify-center text-muted">
              <ChevronLeftIcon className="size-5" />
            </button>
            <span className="font-serif">{weekLabel(monday)}</span>
            <button type="button" aria-label="Semana siguiente" onClick={() => showWeek(addDays(monday, 7))} className="flex size-11 items-center justify-center text-muted">
              <ChevronLeftIcon className="size-5 rotate-180" />
            </button>
          </div>
          {entries ? (
            <div className={pending ? "pointer-events-none opacity-50" : ""}>
              <WeekSlotList monday={monday} entries={entries} onPick={pick} />
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted">Cargando…</p>
          )}
          {error && <p className="mt-3 text-sm text-red-700 dark:text-red-400">{error}</p>}
        </BottomSheet>
      )}
    </>
  );
}

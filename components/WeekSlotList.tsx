"use client";
// Lista de los 14 huecos de una semana (7 días × comida/cena) para elegir uno.
// Se usa al "Mover" un plato y al "Añadir al menú" desde la ficha de una receta.
// Cada hueco muestra la receta que ya tiene (si la hay) o "libre".
import { DAY_INITIALS, dayOfMonth, today, weekDates } from "@/lib/dates";
import { MEALS, MEAL_LABELS, type Meal, type PlanEntry } from "@/types/plan";

export default function WeekSlotList({
  monday,
  entries,
  current, // hueco actual (se marca y no se puede elegir), p. ej. al mover
  onPick,
}: {
  monday: string;
  entries: PlanEntry[];
  current?: { date: string; meal: Meal };
  onPick: (date: string, meal: Meal, occupant: PlanEntry | undefined) => void;
}) {
  const todayIso = today();

  return (
    <ul className="flex flex-col gap-2">
      {weekDates(monday).map((date, i) => (
        <li key={date} className="flex items-center gap-2">
          {/* Día: inicial y número (hoy en color principal) */}
          <span className={`w-8 shrink-0 text-center text-sm leading-tight ${date === todayIso ? "font-semibold text-accent" : "text-muted"}`}>
            {DAY_INITIALS[i]}
            <br />
            {dayOfMonth(date)}
          </span>
          {MEALS.map((meal) => {
            const occupant = entries.find((e) => e.date === date && e.meal === meal);
            const isCurrent = current?.date === date && current.meal === meal;
            return (
              <button
                key={meal}
                type="button"
                disabled={isCurrent}
                onClick={() => onPick(date, meal, occupant)}
                className={`flex h-12 min-w-0 flex-1 flex-col justify-center rounded-control border px-2 text-left ${
                  isCurrent ? "border-accent bg-accent/10" : "border-line bg-surface active:opacity-70"
                }`}
              >
                <span className="text-[11px] text-muted">{MEAL_LABELS[meal]}</span>
                <span className={`truncate text-sm ${occupant ? "" : "text-muted/70"}`}>
                  {occupant ? occupant.recipe.title : "libre"}
                </span>
              </button>
            );
          })}
        </li>
      ))}
    </ul>
  );
}

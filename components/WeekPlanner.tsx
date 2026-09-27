"use client";
// Pantalla de Inicio (boceto docs/boceto/Boceto.png):
//   - Arriba: "Semana del …" con flechas ‹ › y la fila de días L M X J V S D (hoy marcado).
//   - Debajo: dos tarjetas grandes, Comida y Cena, del día elegido.
//     · Vacía → abre el selector de recetas.
//     · Con receta → foto + título; tocarla abre la ficha; "···" abre raciones / cambiar / mover / quitar.
//   - Deslizar el dedo a los lados cambia de semana.
// Los datos (menú de la semana y recetas) llegan del servidor; los cambios se hacen con
// acciones de servidor, que refrescan la página automáticamente.
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomSheet from "@/components/BottomSheet";
import RecipePicker from "@/components/RecipePicker";
import SuggestSheet from "@/components/SuggestSheet";
import WeekSlotList from "@/components/WeekSlotList";
import { RecipeThumb } from "@/components/RecipeCard";
import { ChevronLeftIcon, LeafIcon, PlusIcon } from "@/components/icons";
import { assignRecipe, moveEntry, removeEntry, setEntryServings } from "@/app/(app)/plan-actions";
import { DAY_INITIALS, addDays, dayLabel, dayOfMonth, weekDates, weekLabel } from "@/lib/dates";
import { MEALS, MEAL_LABELS, type Meal, type PlanEntry } from "@/types/plan";
import type { RecipeListItem } from "@/types/recipe";

// Qué hoja inferior está abierta (si hay alguna).
type Sheet =
  | { kind: "picker"; meal: Meal } // elegir receta para un hueco (vacío o para cambiarla)
  | { kind: "menu"; entry: PlanEntry } // opciones de un plato
  | { kind: "move"; entry: PlanEntry } // elegir destino al mover
  | { kind: "suggest" } // sugerir menú con Claude
  | null;

export default function WeekPlanner({
  monday,
  todayIso,
  initialDay,
  entries,
  recipes,
}: {
  monday: string; // lunes de la semana mostrada
  todayIso: string;
  initialDay: number; // 0 = lunes … 6 = domingo
  entries: PlanEntry[];
  recipes: RecipeListItem[];
}) {
  const router = useRouter();
  const [day, setDay] = useState(initialDay);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const dates = weekDates(monday);
  const selectedDate = dates[day];

  // Cambia el día elegido y lo apunta en la dirección (para conservarlo al volver de una receta).
  function selectDay(index: number) {
    setDay(index);
    window.history.replaceState(null, "", `/?semana=${monday}&dia=${index}`);
  }

  // Cambia de semana (el servidor carga el menú de esa semana). Se mantiene el mismo día de la semana.
  function goToWeek(delta: -1 | 1) {
    router.push(`/?semana=${addDays(monday, delta * 7)}&dia=${day}`);
  }

  // Ejecuta una acción del servidor, cierra la hoja y muestra un error si falla.
  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        setSheet(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Algo ha fallado.");
      }
    });
  }

  // ---- Deslizar a los lados para cambiar de semana ----
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    // Solo cuenta si es un gesto claramente horizontal y largo.
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) goToWeek(dx < 0 ? 1 : -1);
  }

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="pb-6 pt-4">
      {/* ---------- Semana: ‹ Semana del 28 sep › ---------- */}
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Semana anterior" onClick={() => goToWeek(-1)} className="flex size-11 items-center justify-center text-muted">
          <ChevronLeftIcon className="size-6" />
        </button>
        <h1 className="font-serif text-xl">{weekLabel(monday)}</h1>
        <button type="button" aria-label="Semana siguiente" onClick={() => goToWeek(1)} className="flex size-11 items-center justify-center text-muted">
          <ChevronLeftIcon className="size-6 rotate-180" />
        </button>
      </div>

      {/* ---------- Días: L M X J V S D ---------- */}
      <div className="mt-2 flex gap-1 border-b border-line pb-3">
        {dates.map((date, i) => {
          const selected = i === day;
          const isToday = date === todayIso;
          const planned = entries.some((e) => e.date === date);
          return (
            <button
              key={date}
              type="button"
              onClick={() => selectDay(i)}
              aria-pressed={selected}
              aria-label={`${dayLabel(date)}${isToday ? " (hoy)" : ""}`}
              className={`flex h-14 flex-1 flex-col items-center justify-center rounded-control text-sm ${
                selected ? "bg-accent font-semibold text-on-accent" : isToday ? "text-accent" : "text-muted"
              }`}
            >
              <span className={isToday && !selected ? "font-semibold underline underline-offset-4" : ""}>{DAY_INITIALS[i]}</span>
              <span className="text-xs">{dayOfMonth(date)}</span>
              {/* Puntito si el día ya tiene algo planificado */}
              <span className={`mt-0.5 size-1 rounded-full ${planned ? (selected ? "bg-on-accent" : "bg-highlight") : "bg-transparent"}`} />
            </button>
          );
        })}
      </div>

      {/* ---------- Tarjetas Comida y Cena del día elegido ---------- */}
      <div className="mt-4 flex flex-col gap-4">
        {MEALS.map((meal) => {
          const entry = entries.find((e) => e.date === selectedDate && e.meal === meal);
          return (
            <section key={meal} className="rounded-card border border-line bg-surface p-3">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-serif text-base italic text-muted">{MEAL_LABELS[meal]}</h2>
                {entry && (
                  <button
                    type="button"
                    aria-label={`Opciones de ${MEAL_LABELS[meal].toLowerCase()}`}
                    onClick={() => setSheet({ kind: "menu", entry })}
                    className="-my-2 -mr-2 flex size-11 items-center justify-center text-xl text-muted"
                  >
                    ···
                  </button>
                )}
              </div>
              {entry ? (
                // Tarjeta con receta: foto a la izquierda, título y datos a la derecha → ficha.
                <Link href={`/recetas/${entry.recipe.id}`} className="flex items-center gap-3 active:opacity-70">
                  <RecipeThumb photoUrl={entry.recipe.photo_url} className="size-24" />
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-lg leading-snug">{entry.recipe.title}</p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-muted">
                      {entry.servings} {entry.servings === 1 ? "ración" : "raciones"}
                      {entry.recipe.is_vegetarian && <LeafIcon className="size-4 text-accent" />}
                    </p>
                  </div>
                </Link>
              ) : (
                // Tarjeta vacía: tocarla abre el selector de recetas.
                <button
                  type="button"
                  onClick={() => setSheet({ kind: "picker", meal })}
                  className="flex h-24 w-full items-center justify-center gap-2 rounded-control border border-dashed border-line text-sm text-accent"
                >
                  <PlusIcon className="size-4" />
                  Añadir receta
                </button>
              )}
            </section>
          );
        })}
      </div>
      {error && !sheet && <p className="mt-3 text-sm text-red-700 dark:text-red-400">{error}</p>}

      {/* Sugerir menú (solo en semanas que no han terminado) */}
      {addDays(monday, 6) >= todayIso && (
        <button
          type="button"
          onClick={() => setSheet({ kind: "suggest" })}
          className="mt-4 h-12 w-full rounded-control border border-accent font-semibold text-accent"
        >
          Sugerir menú
        </button>
      )}

      {/* ---------- Hojas inferiores ---------- */}
      {sheet?.kind === "picker" && (
        <BottomSheet title={`${MEAL_LABELS[sheet.meal]} · ${dayLabel(selectedDate)}`} onClose={() => setSheet(null)}>
          <RecipePicker
            recipes={recipes}
            disabled={pending}
            onPick={(recipe) => run(() => assignRecipe(selectedDate, sheet.meal, recipe.id, recipe.servings))}
          />
          {error && <p className="mt-3 text-sm text-red-700 dark:text-red-400">{error}</p>}
        </BottomSheet>
      )}

      {sheet?.kind === "menu" && (
        <BottomSheet title={sheet.entry.recipe.title} onClose={() => setSheet(null)}>
          <EntryMenu
            entry={sheet.entry}
            pending={pending}
            onServings={(n) => run(() => setEntryServings(sheet.entry.id, n))}
            onChange={() => setSheet({ kind: "picker", meal: sheet.entry.meal })}
            onMove={() => setSheet({ kind: "move", entry: sheet.entry })}
            onRemove={() => run(() => removeEntry(sheet.entry.id))}
          />
          {error && <p className="mt-3 text-sm text-red-700 dark:text-red-400">{error}</p>}
        </BottomSheet>
      )}

      {sheet?.kind === "suggest" && (
        <BottomSheet title="Sugerir menú" onClose={() => setSheet(null)}>
          <SuggestSheet
            monday={monday}
            // Si en esta semana ya no quedan cenas libres (p. ej. un domingo), se propone la siguiente.
            startWithNextWeek={!dates.some((d) => d >= todayIso && !entries.some((e) => e.date === d && e.meal === "cena"))}
            onDone={(target) => {
              setSheet(null);
              if (target !== monday) router.push(`/?semana=${target}&dia=0`);
            }}
          />
        </BottomSheet>
      )}

      {sheet?.kind === "move" && (
        <BottomSheet title="Mover a…" onClose={() => setSheet(null)}>
          <p className="mb-3 text-sm text-muted">Si el hueco está ocupado, los platos se intercambian.</p>
          <WeekSlotList
            monday={monday}
            entries={entries}
            current={{ date: sheet.entry.date, meal: sheet.entry.meal }}
            onPick={(date, meal) => run(() => moveEntry(sheet.entry.id, date, meal))}
          />
          {error && <p className="mt-3 text-sm text-red-700 dark:text-red-400">{error}</p>}
        </BottomSheet>
      )}
    </div>
  );
}

// Opciones de un plato del menú: raciones, ver receta, cambiar, mover y quitar.
function EntryMenu({
  entry,
  pending,
  onServings,
  onChange,
  onMove,
  onRemove,
}: {
  entry: PlanEntry;
  pending: boolean;
  onServings: (n: number) => void;
  onChange: () => void;
  onMove: () => void;
  onRemove: () => void;
}) {
  // Las raciones se cambian en pantalla al momento y se guardan al pulsar "Guardar".
  const [servings, setServings] = useState(entry.servings);
  const rowClass = "flex h-12 w-full items-center rounded-control border border-line bg-surface px-3 text-left";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between rounded-control border border-line bg-surface pl-3">
        <span>Raciones</span>
        <div className="flex items-center">
          <button type="button" aria-label="Menos raciones" onClick={() => setServings((s) => Math.max(1, s - 1))} className="size-12 text-lg text-muted">−</button>
          <span className="w-6 text-center font-medium">{servings}</span>
          <button type="button" aria-label="Más raciones" onClick={() => setServings((s) => s + 1)} className="size-12 text-lg text-muted">+</button>
        </div>
      </div>
      {servings !== entry.servings && (
        <button type="button" disabled={pending} onClick={() => onServings(servings)} className="h-12 w-full rounded-control bg-accent font-semibold text-on-accent disabled:opacity-50">
          {pending ? "Guardando…" : "Guardar raciones"}
        </button>
      )}
      <Link href={`/recetas/${entry.recipe.id}`} className={rowClass}>Ver receta</Link>
      <button type="button" onClick={onChange} className={rowClass}>Cambiar receta</button>
      <button type="button" onClick={onMove} className={rowClass}>Mover a otro día</button>
      <button type="button" disabled={pending} onClick={onRemove} className={`${rowClass} text-red-700 disabled:opacity-50 dark:text-red-400`}>
        Quitar del menú
      </button>
    </div>
  );
}

"use client";
// Contenido de la hoja "Sugerir menú" de Inicio:
//   1. Elegir semana (la mostrada o la siguiente) y qué rellenar (solo cenas, o comidas y cenas).
//   2. Claude propone recetas para los huecos vacíos → se muestran para revisar.
//   3. "Añadir al menú" las guarda; "Otra propuesta" vuelve a preguntar.
import { useState, useTransition } from "react";
import { applySuggestions } from "@/app/(app)/plan-actions";
import { addDays, dayLabel, weekLabel } from "@/lib/dates";
import { MEAL_LABELS, type Meal } from "@/types/plan";

type Suggestion = { date: string; meal: Meal; recipe_id: string; title: string; servings: number };

export default function SuggestSheet({
  monday,
  startWithNextWeek,
  onDone,
}: {
  monday: string; // semana que se está viendo en Inicio
  startWithNextWeek: boolean; // true si en la semana mostrada ya no quedan cenas libres
  onDone: (targetMonday: string) => void; // tras guardar: a qué semana ir
}) {
  // Semana a rellenar: la mostrada o la siguiente.
  const [target, setTarget] = useState(startWithNextWeek ? addDays(monday, 7) : monday);
  const [meals, setMeals] = useState<Meal[]>(["cena"]); // por defecto, solo cenas
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  // Pide la propuesta al servidor (tarda unos segundos: Claude la piensa).
  async function suggest() {
    setLoading(true);
    setError(null);
    setSuggestions(null);
    try {
      const response = await fetch("/api/sugerir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monday: target, meals }),
      });
      const data = (await response.json().catch(() => ({}))) as { suggestions?: Suggestion[]; error?: string };
      if (!response.ok || !data.suggestions) setError(data.error ?? "No se ha podido sugerir el menú.");
      else if (data.suggestions.length === 0) setError("No se ha encontrado ninguna receta adecuada para los huecos libres.");
      else setSuggestions(data.suggestions);
    } catch {
      setError("Sin conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  function accept() {
    if (!suggestions) return;
    startSaving(async () => {
      try {
        await applySuggestions(suggestions);
        onDone(target);
      } catch {
        setError("No se han podido añadir al menú.");
      }
    });
  }

  const optionClass = (active: boolean) =>
    `h-11 flex-1 rounded-control text-sm ${active ? "bg-accent font-semibold text-on-accent" : "text-muted"}`;

  return (
    <div className="flex flex-col gap-4">
      {/* Qué semana (al cambiarla se descarta la propuesta anterior) */}
      <div className="flex gap-1 rounded-control border border-line bg-surface p-1">
        {[monday, addDays(monday, 7)].map((week) => (
          <button
            key={week}
            type="button"
            className={optionClass(target === week)}
            onClick={() => {
              setTarget(week);
              setSuggestions(null);
              setError(null);
            }}
          >
            {weekLabel(week).replace("Semana del ", "Sem. ")}
          </button>
        ))}
      </div>

      {/* Qué rellenar */}
      <div className="flex gap-1 rounded-control border border-line bg-surface p-1">
        <button type="button" className={optionClass(meals.length === 1)} onClick={() => { setMeals(["cena"]); setSuggestions(null); }}>
          Solo cenas
        </button>
        <button type="button" className={optionClass(meals.length === 2)} onClick={() => { setMeals(["comida", "cena"]); setSuggestions(null); }}>
          Comidas y cenas
        </button>
      </div>
      <p className="text-sm text-muted">
        Solo se rellenan los huecos vacíos (y no los días ya pasados). Prioriza lo vegetariano y evita repetir platos recientes.
      </p>

      {/* Propuesta */}
      {suggestions && (
        <ul className="flex flex-col divide-y divide-line rounded-card border border-line bg-surface">
          {suggestions.map((s) => (
            <li key={`${s.date}-${s.meal}`} className="flex gap-3 px-3 py-2">
              <span className="w-28 shrink-0 text-sm text-muted">
                {dayLabel(s.date)}
                <br />
                {MEAL_LABELS[s.meal]}
              </span>
              <span className="font-serif leading-snug">{s.title}</span>
            </li>
          ))}
        </ul>
      )}

      {suggestions ? (
        <div className="flex gap-2">
          <button type="button" disabled={loading || saving} onClick={suggest} className="h-12 flex-1 rounded-control border border-line text-sm disabled:opacity-50">
            {loading ? "Pensando…" : "Otra propuesta"}
          </button>
          <button type="button" disabled={loading || saving} onClick={accept} className="h-12 flex-1 rounded-control bg-accent font-semibold text-on-accent disabled:opacity-50">
            {saving ? "Añadiendo…" : "Añadir al menú"}
          </button>
        </div>
      ) : (
        <button type="button" disabled={loading} onClick={suggest} className="h-12 w-full rounded-control bg-accent font-semibold text-on-accent disabled:opacity-50">
          {loading ? "Pensando el menú…" : "Sugerir"}
        </button>
      )}
      {loading && <p className="text-center text-sm text-muted">Puede tardar entre 10 y 30 segundos.</p>}
      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}

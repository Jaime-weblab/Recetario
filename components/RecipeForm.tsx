"use client";
// Formulario para crear o editar una receta (pensado para el móvil).
// - `initial`: datos con los que se abre (receta a editar, o en la Fase 1B, una receta importada).
// - `recipeId`: null al crear; el id al editar.
// - `ingredientNames`: catálogo de ingredientes ya usados, para sugerirlos al escribir.
// Al guardar envía un único objeto RecipeInput a la acción del servidor `saveRecipe`.
import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { saveRecipe } from "@/app/(app)/recetas/actions";
import { formatNumber, parseQuantity } from "@/lib/units";
import {
  DISH_TYPES,
  DISH_TYPE_LABELS,
  UNITS,
  UNIT_LABELS,
  type DishType,
  type RecipeInput,
  type Unit,
} from "@/types/recipe";

// Fila de ingrediente mientras se edita. La cantidad es texto (para permitir "1,5" o "1/2")
// y `key` es un identificador interno para que React no mezcle filas al borrar o mover.
type IngredientRow = { key: number; quantity: string; unit: Unit | ""; name: string; note: string };
type StepRow = { key: number; text: string };

// Contador para dar un `key` único a cada fila nueva.
let nextKey = 1;
const newIngredient = (): IngredientRow => ({ key: nextKey++, quantity: "", unit: "", name: "", note: "" });
const newStep = (): StepRow => ({ key: nextKey++, text: "" });

// Receta vacía (formulario de "Nueva receta").
export const EMPTY_RECIPE: RecipeInput = {
  title: "",
  description: "",
  servings: 2,
  prep_minutes: null,
  cook_minutes: null,
  tags: [],
  is_vegetarian: true, // se prioriza lo vegetariano: por defecto marcado
  main_ingredient: "",
  dish_type: null,
  photo_url: null,
  source_url: "",
  notes: "",
  ingredients: [],
  steps: [],
};

// Mueve el elemento `index` una posición arriba (-1) o abajo (+1) dentro de una lista.
function move<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const copy = [...list];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

// Clases comunes de campos y etiquetas (text-base = 16 px, evita el zoom de iOS al tocar).
const inputClass =
  "h-11 w-full min-w-0 rounded-control border border-line bg-surface px-3 text-base outline-none focus:border-accent";
const labelClass = "mb-1 block text-sm text-muted";
const sectionTitleClass = "mb-3 font-serif text-lg italic text-muted";

export default function RecipeForm({
  initial = EMPTY_RECIPE,
  recipeId = null,
  ingredientNames,
}: {
  initial?: RecipeInput;
  recipeId?: string | null;
  ingredientNames: string[];
}) {
  // ---- Estado de cada campo ----
  const [title, setTitle] = useState(initial.title);
  const [servings, setServings] = useState(initial.servings);
  const [prep, setPrep] = useState(initial.prep_minutes?.toString() ?? "");
  const [cook, setCook] = useState(initial.cook_minutes?.toString() ?? "");
  const [dishType, setDishType] = useState<DishType | "">(initial.dish_type ?? "");
  const [mainIngredient, setMainIngredient] = useState(initial.main_ingredient);
  const [isVegetarian, setIsVegetarian] = useState(initial.is_vegetarian);
  const [description, setDescription] = useState(initial.description);
  const [notes, setNotes] = useState(initial.notes);
  const [tags, setTags] = useState(initial.tags.join(", "));
  const [sourceUrl, setSourceUrl] = useState(initial.source_url);
  const [ingredients, setIngredients] = useState<IngredientRow[]>(() =>
    initial.ingredients.length
      ? initial.ingredients.map((i) => ({
          key: nextKey++,
          quantity: i.quantity != null ? formatNumber(i.quantity) : "",
          unit: i.unit ?? "",
          name: i.name,
          note: i.note,
        }))
      : [newIngredient()],
  );
  const [steps, setSteps] = useState<StepRow[]>(() =>
    initial.steps.length ? initial.steps.map((text) => ({ key: nextKey++, text })) : [newStep()],
  );

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Cambia un campo de una fila de ingrediente.
  const updateIngredient = (key: number, patch: Partial<IngredientRow>) =>
    setIngredients((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  // Reúne todo en un RecipeInput y lo envía al servidor.
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Cantidades escritas pero no válidas (p. ej. "dos"): avisamos en vez de perderlas.
    const badRow = ingredients.find((r) => r.name.trim() && r.quantity.trim() && parseQuantity(r.quantity) == null);
    if (badRow) {
      setError(`Revisa la cantidad de "${badRow.name.trim()}": escribe un número (ej. 200, 1,5 o 1/2).`);
      return;
    }

    const input: RecipeInput = {
      title,
      description,
      servings,
      prep_minutes: prep ? Number(prep) : null,
      cook_minutes: cook ? Number(cook) : null,
      tags: tags.split(","),
      is_vegetarian: isVegetarian,
      main_ingredient: mainIngredient,
      dish_type: dishType || null,
      photo_url: initial.photo_url,
      source_url: sourceUrl,
      notes,
      ingredients: ingredients.map((r) => ({
        name: r.name,
        quantity: parseQuantity(r.quantity),
        unit: r.unit || null,
        note: r.note,
      })),
      steps: steps.map((s) => s.text),
    };

    startTransition(async () => {
      // Si va bien, el servidor nos lleva a la ficha; si no, devuelve un error.
      const result = await saveRecipe(recipeId, input);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 pb-8 pt-4">
      {/* Sugerencias de ingredientes ya usados (las muestra el teclado al escribir un nombre) */}
      <datalist id="ingredient-names">
        {ingredientNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {/* ---------- Datos básicos ---------- */}
      <section className="flex flex-col gap-4">
        <div>
          <label htmlFor="title" className={labelClass}>Título</label>
          <input
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Lentejas con verduras"
            className={`${inputClass} font-serif text-lg`}
          />
        </div>

        {/* Raciones con botones − / +, y tiempos */}
        <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-2">
          <div>
            <span className={labelClass}>Raciones</span>
            <div className="flex h-11 items-center justify-between rounded-control border border-line bg-surface">
              <button type="button" aria-label="Menos raciones" onClick={() => setServings((s) => Math.max(1, s - 1))} className="h-full w-11 text-lg text-muted">−</button>
              <span className="text-base">{servings}</span>
              <button type="button" aria-label="Más raciones" onClick={() => setServings((s) => s + 1)} className="h-full w-11 text-lg text-muted">+</button>
            </div>
          </div>
          <div>
            <label htmlFor="prep" className={labelClass}>Prep. (min)</label>
            <input id="prep" inputMode="numeric" pattern="[0-9]*" value={prep} onChange={(e) => setPrep(e.target.value.replace(/\D/g, ""))} className={inputClass} />
          </div>
          <div>
            <label htmlFor="cook" className={labelClass}>Cocción (min)</label>
            <input id="cook" inputMode="numeric" pattern="[0-9]*" value={cook} onChange={(e) => setCook(e.target.value.replace(/\D/g, ""))} className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="dishType" className={labelClass}>Tipo de plato</label>
            <select id="dishType" value={dishType} onChange={(e) => setDishType(e.target.value as DishType | "")} className={inputClass}>
              <option value="">—</option>
              {DISH_TYPES.map((t) => (
                <option key={t} value={t}>{DISH_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="main" className={labelClass}>Ingrediente principal</label>
            <input id="main" value={mainIngredient} onChange={(e) => setMainIngredient(e.target.value)} placeholder="lentejas" className={inputClass} />
          </div>
        </div>

        {/* Interruptor "Vegetariana" (una casilla con aspecto de botón grande) */}
        <label className="flex h-11 items-center justify-between rounded-control border border-line bg-surface px-3">
          <span className="text-base">Vegetariana</span>
          <input type="checkbox" checked={isVegetarian} onChange={(e) => setIsVegetarian(e.target.checked)} className="size-5 accent-[var(--accent)]" />
        </label>
      </section>

      {/* ---------- Ingredientes ---------- */}
      <section>
        <h2 className={sectionTitleClass}>Ingredientes</h2>
        <ul className="flex flex-col gap-3">
          {ingredients.map((row) => (
            <li key={row.key} className="rounded-card border border-line bg-surface p-2">
              {/* Fila 1: cantidad · unidad · nombre */}
              <div className="flex gap-2">
                <input
                  aria-label="Cantidad"
                  inputMode="decimal"
                  placeholder="200"
                  value={row.quantity}
                  onChange={(e) => updateIngredient(row.key, { quantity: e.target.value })}
                  className={`${inputClass} w-16 shrink-0 px-2 text-center`}
                />
                <select
                  aria-label="Unidad"
                  value={row.unit}
                  onChange={(e) => updateIngredient(row.key, { unit: e.target.value as Unit | "" })}
                  className={`${inputClass} w-20 shrink-0 px-2`}
                >
                  <option value="">—</option>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{UNIT_LABELS[u]}</option>
                  ))}
                </select>
                <input
                  aria-label="Ingrediente"
                  list="ingredient-names"
                  placeholder="garbanzos"
                  value={row.name}
                  onChange={(e) => updateIngredient(row.key, { name: e.target.value })}
                  className={inputClass}
                />
              </div>
              {/* Fila 2: nota opcional · borrar */}
              <div className="mt-2 flex gap-2">
                <input
                  aria-label="Nota"
                  placeholder="nota (picado, en dados…)"
                  value={row.note}
                  onChange={(e) => updateIngredient(row.key, { note: e.target.value })}
                  className={`${inputClass} text-muted`}
                />
                <button
                  type="button"
                  aria-label="Quitar ingrediente"
                  onClick={() => setIngredients((rows) => rows.filter((r) => r.key !== row.key))}
                  className="flex size-11 shrink-0 items-center justify-center text-muted"
                >
                  <TrashIcon />
                </button>
              </div>
            </li>
          ))}
        </ul>
        <AddButton onClick={() => setIngredients((rows) => [...rows, newIngredient()])}>Añadir ingrediente</AddButton>
      </section>

      {/* ---------- Pasos ---------- */}
      <section>
        <h2 className={sectionTitleClass}>Pasos</h2>
        <ol className="flex flex-col gap-3">
          {steps.map((step, index) => (
            <li key={step.key} className="flex gap-2">
              <span className="w-6 shrink-0 pt-2.5 text-right font-serif text-lg text-accent">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <textarea
                  aria-label={`Paso ${index + 1}`}
                  rows={3}
                  value={step.text}
                  onChange={(e) =>
                    setSteps((rows) => rows.map((r) => (r.key === step.key ? { ...r, text: e.target.value } : r)))
                  }
                  className="block w-full rounded-control border border-line bg-surface p-3 text-base outline-none focus:border-accent"
                />
                {/* Subir · bajar · quitar (debajo del texto, a tamaño táctil completo) */}
                <div className="flex justify-end">
                  <IconButton label="Subir paso" onClick={() => setSteps((rows) => move(rows, index, -1))}><ArrowUpIcon className="size-4" /></IconButton>
                  <IconButton label="Bajar paso" onClick={() => setSteps((rows) => move(rows, index, 1))}><ArrowDownIcon className="size-4" /></IconButton>
                  <IconButton label="Quitar paso" onClick={() => setSteps((rows) => rows.filter((r) => r.key !== step.key))}><TrashIcon className="size-4" /></IconButton>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <AddButton onClick={() => setSteps((rows) => [...rows, newStep()])}>Añadir paso</AddButton>
      </section>

      {/* ---------- Más información (opcional) ---------- */}
      <section className="flex flex-col gap-4">
        <h2 className={sectionTitleClass + " mb-0"}>Más información</h2>
        <div>
          <label htmlFor="description" className={labelClass}>Descripción</label>
          <textarea id="description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-control border border-line bg-surface p-3 text-base outline-none focus:border-accent" />
        </div>
        <div>
          <label htmlFor="notes" className={labelClass}>Notas</label>
          <textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Trucos, variantes…" className="w-full rounded-control border border-line bg-surface p-3 text-base outline-none focus:border-accent" />
        </div>
        <div>
          <label htmlFor="tags" className={labelClass}>Etiquetas (separadas por comas)</label>
          <input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="rápida, invierno, tupper" className={inputClass} />
        </div>
        <div>
          <label htmlFor="source" className={labelClass}>Enlace de origen</label>
          <input id="source" type="url" inputMode="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" className={inputClass} />
        </div>
      </section>

      {/* ---------- Guardar / cancelar ---------- */}
      <div className="flex flex-col gap-2">
        {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
        <button type="submit" disabled={pending} className="h-12 w-full rounded-control bg-accent font-semibold text-on-accent disabled:opacity-50">
          {pending ? "Guardando…" : "Guardar receta"}
        </button>
        <Link href={recipeId ? `/recetas/${recipeId}` : "/recetas"} className="flex h-11 items-center justify-center text-sm text-muted">
          Cancelar
        </Link>
      </div>
    </form>
  );
}

// Botón "+ Añadir …" bajo las listas.
function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-control border border-dashed border-line text-sm text-accent">
      <PlusIcon className="size-4" />
      {children}
    </button>
  );
}

// Botón de icono (subir/bajar/quitar paso), 44 px: el mínimo cómodo para el dedo.
function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="flex size-11 items-center justify-center text-muted">
      {children}
    </button>
  );
}

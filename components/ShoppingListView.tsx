"use client";
// Pantalla "Lista de la compra" (Fase 3):
//   - Semana con flechas ‹ › (como Inicio).
//   - Botón para generar/actualizar la lista desde el menú de la semana.
//   - Artículos agrupados por sección del súper; tocar = marcar como comprado (al instante).
//   - "···" en cada artículo: cambiar de sección (se recuerda) o quitarlo.
//   - Añadir artículos a mano al final.
import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomSheet from "@/components/BottomSheet";
import { ChevronLeftIcon, PlusIcon } from "@/components/icons";
import {
  addManualItem,
  deleteItem,
  generateList,
  setItemChecked,
  setItemSection,
} from "@/app/(app)/lista/actions";
import { addDays, weekLabel } from "@/lib/dates";
import { formatQuantity } from "@/lib/units";
import { SECTIONS, SECTION_LABELS, type ShoppingItem, type ShoppingList, type ShoppingSection } from "@/types/shopping";

export default function ShoppingListView({
  monday,
  list,
  hasPlan,
}: {
  monday: string;
  list: ShoppingList | null;
  hasPlan: boolean; // ¿hay platos en el menú de esta semana?
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [menuItem, setMenuItem] = useState<ShoppingItem | null>(null);
  const [newName, setNewName] = useState("");
  const [newSection, setNewSection] = useState<ShoppingSection>("otros");

  // Marcar/desmarcar se ve al instante; el servidor lo guarda después.
  const [items, setOptimisticChecked] = useOptimistic(
    list?.items ?? [],
    (state: ShoppingItem[], change: { id: string; checked: boolean }) =>
      state.map((item) => (item.id === change.id ? { ...item, is_checked: change.checked } : item)),
  );

  // Ejecuta una acción del servidor mostrando el error si falla.
  function run(action: () => Promise<void>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        after?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Algo ha fallado.");
      }
    });
  }

  function toggle(item: ShoppingItem) {
    startTransition(async () => {
      setOptimisticChecked({ id: item.id, checked: !item.is_checked });
      try {
        await setItemChecked(item.id, !item.is_checked);
      } catch {
        setError("No se ha podido marcar. Revisa tu conexión.");
      }
    });
  }

  function addItem(e: React.FormEvent) {
    e.preventDefault();
    run(() => addManualItem(monday, newName, newSection), () => setNewName(""));
  }

  const done = items.filter((i) => i.is_checked).length;

  return (
    <div className="pb-6 pt-4">
      {/* ---------- Semana ---------- */}
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Semana anterior" onClick={() => router.push(`/lista?semana=${addDays(monday, -7)}`)} className="flex size-11 items-center justify-center text-muted">
          <ChevronLeftIcon className="size-6" />
        </button>
        <h2 className="font-serif text-xl">{weekLabel(monday)}</h2>
        <button type="button" aria-label="Semana siguiente" onClick={() => router.push(`/lista?semana=${addDays(monday, 7)}`)} className="flex size-11 items-center justify-center text-muted">
          <ChevronLeftIcon className="size-6 rotate-180" />
        </button>
      </div>

      {/* ---------- Generar / actualizar ---------- */}
      {hasPlan ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => generateList(monday))}
          className={`mt-3 h-12 w-full rounded-control font-semibold disabled:opacity-50 ${
            list ? "border border-accent text-accent" : "bg-accent text-on-accent"
          }`}
        >
          {pending ? "Preparando la lista…" : list ? "Actualizar desde el menú" : "Generar lista desde el menú"}
        </button>
      ) : (
        !list && (
          <p className="mt-6 text-center text-sm text-muted">
            No hay platos en el menú de esta semana.{" "}
            <Link href={`/?semana=${monday}`} className="text-accent underline">Planificar</Link>
          </p>
        )
      )}
      {error && <p className="mt-3 text-sm text-red-700 dark:text-red-400">{error}</p>}

      {/* ---------- Artículos por sección ---------- */}
      {items.length > 0 && (
        <p className="mt-4 text-sm text-muted">
          {done} de {items.length} comprados
        </p>
      )}
      <div className="mt-2 flex flex-col gap-5">
        {SECTIONS.map((section) => {
          // Dentro de cada sección: primero lo pendiente (por nombre), al final lo comprado.
          const sectionItems = items
            .filter((i) => i.shopping_section === section)
            .sort((a, b) => Number(a.is_checked) - Number(b.is_checked) || a.name.localeCompare(b.name, "es"));
          if (sectionItems.length === 0) return null;
          return (
            <section key={section}>
              <h3 className="mb-1 border-b border-line pb-1 font-serif text-base italic text-muted">{SECTION_LABELS[section]}</h3>
              <ul>
                {sectionItems.map((item) => (
                  <li key={item.id} className="flex items-center border-b border-line/50 last:border-0">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={item.is_checked}
                      onClick={() => toggle(item)}
                      className="flex min-h-12 flex-1 items-center gap-3 py-2 text-left"
                    >
                      {/* Casilla */}
                      <span className={`flex size-6 shrink-0 items-center justify-center rounded-control border ${item.is_checked ? "border-accent bg-accent text-on-accent" : "border-line bg-surface"}`}>
                        {item.is_checked && "✓"}
                      </span>
                      <span className={`flex-1 ${item.is_checked ? "text-muted line-through" : ""}`}>{item.name}</span>
                      <span className={`shrink-0 text-sm ${item.is_checked ? "text-muted/70 line-through" : "text-muted"}`}>
                        {formatQuantity(item.quantity, item.unit)}
                      </span>
                    </button>
                    <button type="button" aria-label={`Opciones de ${item.name}`} onClick={() => setMenuItem(item)} className="flex size-11 shrink-0 items-center justify-center text-muted">
                      ···
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {/* ---------- Añadir a mano ---------- */}
      {(list || hasPlan) && (
        <form onSubmit={addItem} className="mt-6 flex flex-col gap-2 rounded-card border border-line bg-surface p-3">
          <label htmlFor="new-item" className="text-sm text-muted">Añadir a la lista</label>
          <input
            id="new-item"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="papel de cocina, 2 l de leche…"
            className="h-11 w-full rounded-control border border-line bg-background px-3 text-base outline-none focus:border-accent"
          />
          <div className="flex gap-2">
            <select
              aria-label="Sección"
              value={newSection}
              onChange={(e) => setNewSection(e.target.value as ShoppingSection)}
              className="h-11 min-w-0 flex-1 rounded-control border border-line bg-background px-2 text-base"
            >
              {SECTIONS.map((s) => (
                <option key={s} value={s}>{SECTION_LABELS[s]}</option>
              ))}
            </select>
            <button type="submit" disabled={pending || !newName.trim()} className="flex h-11 items-center gap-1 rounded-control bg-accent px-4 font-semibold text-on-accent disabled:opacity-50">
              <PlusIcon className="size-4" />
              Añadir
            </button>
          </div>
        </form>
      )}

      {/* ---------- Opciones de un artículo ---------- */}
      {menuItem && (
        <BottomSheet title={menuItem.name} onClose={() => setMenuItem(null)}>
          <p className="mb-2 text-sm text-muted">Sección{menuItem.ingredient_id ? " (se recordará para las próximas listas)" : ""}</p>
          <div className="flex flex-wrap gap-2">
            {SECTIONS.map((s) => (
              <button
                key={s}
                type="button"
                disabled={pending}
                onClick={() => run(() => setItemSection(menuItem.id, s), () => setMenuItem(null))}
                className={`h-11 rounded-control border px-3 text-sm ${
                  menuItem.shopping_section === s ? "border-accent bg-accent text-on-accent" : "border-line bg-surface"
                }`}
              >
                {SECTION_LABELS[s]}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => deleteItem(menuItem.id), () => setMenuItem(null))}
            className="mt-4 h-12 w-full rounded-control border border-line text-red-700 disabled:opacity-50 dark:text-red-400"
          >
            Quitar de la lista
          </button>
        </BottomSheet>
      )}
    </div>
  );
}

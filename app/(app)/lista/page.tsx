// Pantalla de Lista de la compra (Fase 3). Carga la lista de la semana (?semana=AAAA-MM-DD,
// por defecto la actual); la interacción está en components/ShoppingListView.
import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import ShoppingListView from "@/components/ShoppingListView";
import { isIsoDate, mondayOf, today } from "@/lib/dates";
import { getWeekPlan } from "@/lib/plan";
import { getShoppingList } from "@/lib/shopping";

export const metadata: Metadata = { title: "Lista de la compra" };

export default async function ShoppingListPage({ searchParams }: PageProps<"/lista">) {
  const { semana } = await searchParams;
  const monday = typeof semana === "string" && isIsoDate(semana) ? mondayOf(semana) : mondayOf(today());

  const [list, plan] = await Promise.all([getShoppingList(monday), getWeekPlan(monday)]);

  return (
    <>
      <PageHeader title="Lista de la compra" />
      {/* key: empezar de cero al cambiar de semana */}
      <ShoppingListView key={monday} monday={monday} list={list} hasPlan={plan.length > 0} />
    </>
  );
}

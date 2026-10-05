// Pantalla de Inicio: el menú de la semana (Fase 2).
// Lee de la dirección qué semana y qué día mostrar (?semana=AAAA-MM-DD&dia=0..6);
// por defecto, la semana actual y hoy. La interacción está en components/WeekPlanner.
// (La contraseña y cerrar sesión están en /cuenta, enlazada desde el final de Recetas.)
import WeekPlanner from "@/components/WeekPlanner";
import { isIsoDate, mondayOf, today, weekdayIndex } from "@/lib/dates";
import { getWeekPlan } from "@/lib/plan";
import { listRecipes } from "@/lib/recipes";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const todayIso = today();

  // Semana: la indicada (normalizada a su lunes) o la actual.
  const semana = typeof params.semana === "string" ? params.semana : null;
  const monday = isIsoDate(semana) ? mondayOf(semana) : mondayOf(todayIso);

  // Día: el indicado; si no, hoy (si es esta semana) o el lunes.
  const diaParam = Number(params.dia);
  const initialDay =
    Number.isInteger(diaParam) && diaParam >= 0 && diaParam <= 6
      ? diaParam
      : monday === mondayOf(todayIso)
        ? weekdayIndex(todayIso)
        : 0;

  const [entries, recipes] = await Promise.all([getWeekPlan(monday), listRecipes()]);

  return (
    <WeekPlanner
      // `key` fuerza a empezar de cero al cambiar de semana (día elegido, hojas abiertas…).
      key={monday}
      monday={monday}
      todayIso={todayIso}
      initialDay={initialDay}
      entries={entries}
      recipes={recipes}
    />
  );
}

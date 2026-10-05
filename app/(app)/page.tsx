// Pantalla de Inicio: el menú de la semana (Fase 2).
// Lee de la dirección qué semana y qué día mostrar (?semana=AAAA-MM-DD&dia=0..6);
// por defecto, la semana actual y hoy. La interacción está en components/WeekPlanner.
import PasswordForm from "@/components/PasswordForm";
import WeekPlanner from "@/components/WeekPlanner";
import { isIsoDate, mondayOf, today, weekdayIndex } from "@/lib/dates";
import { getWeekPlan } from "@/lib/plan";
import { listRecipes } from "@/lib/recipes";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();
  const [entries, recipes, { data: auth }] = await Promise.all([
    getWeekPlan(monday),
    listRecipes(),
    supabase.auth.getClaims(),
  ]);
  const email = (auth?.claims?.email as string | undefined) ?? "";

  return (
    <>
      <WeekPlanner
        // `key` fuerza a empezar de cero al cambiar de semana (día elegido, hojas abiertas…).
        key={monday}
        monday={monday}
        todayIso={todayIso}
        initialDay={initialDay}
        entries={entries}
        recipes={recipes}
      />
      {/* Cuenta (discreto, al final de Inicio): contraseña y cerrar sesión */}
      <div className="mt-6">
        <PasswordForm email={email} />
      </div>
      <form action="/auth/signout" method="post" className="mt-2 text-center">
        <button type="submit" className="h-11 px-4 text-sm text-muted underline">
          Cerrar sesión
        </button>
      </form>
    </>
  );
}

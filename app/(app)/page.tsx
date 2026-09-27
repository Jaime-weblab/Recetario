// Pantalla de Inicio. En la Fase 2 tendrá el selector de días y las tarjetas Comida/Cena.
// Por ahora (Fase 0) solo confirma que has entrado y permite cerrar sesión.
import PageHeader from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email as string | undefined;

  return (
    <>
      <PageHeader title="Inicio" />
      <div className="mt-4 rounded-card border border-line bg-surface p-5">
        <p className="text-muted">Has entrado como</p>
        <p className="mb-4 font-medium break-all">{email}</p>
        <p className="text-sm text-muted">Aquí irá el menú de la semana (Fase 2).</p>
      </div>
      {/* Formulario POST → /auth/signout */}
      <form action="/auth/signout" method="post" className="mt-6">
        <button type="submit" className="h-11 w-full rounded-control border border-line text-sm text-muted">
          Cerrar sesión
        </button>
      </form>
    </>
  );
}

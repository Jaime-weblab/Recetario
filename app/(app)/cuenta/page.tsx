// Pantalla "Cuenta": crear o cambiar la contraseña y cerrar sesión.
// Se llega desde un enlace discreto al final del listado de Recetas.
import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import PasswordForm from "@/components/PasswordForm";
import { ChevronLeftIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Cuenta" };

export default async function AccountPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = (data?.claims?.email as string | undefined) ?? "";

  return (
    <>
      <Link href="/recetas" className="-ml-2 mt-2 flex h-11 w-fit items-center pr-3 text-sm text-muted">
        <ChevronLeftIcon className="size-5" />
        Recetas
      </Link>
      <PageHeader title="Cuenta" />
      <p className="mt-4 text-sm text-muted">Has entrado como</p>
      <p className="mb-6 break-all">{email}</p>

      <PasswordForm email={email} />

      <form action="/auth/signout" method="post" className="mt-6">
        <button type="submit" className="h-11 w-full rounded-control border border-line text-sm text-muted">
          Cerrar sesión
        </button>
      </form>
    </>
  );
}

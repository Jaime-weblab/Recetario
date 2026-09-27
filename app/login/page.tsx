// Página de acceso (pública). Solo muestra el formulario; la lógica está en components/LoginForm.
import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  // Si venimos de un enlace fallido, /auth/callback añade ?error=enlace
  const { error } = await searchParams;

  return (
    <main className="safe-top safe-bottom flex min-h-dvh flex-col justify-center px-6">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="mb-2 text-3xl font-bold">Recetario</h1>
        <p className="mb-8 text-muted">Entra con tu email. Te enviaremos un enlace y un código.</p>
        {error === "enlace" && (
          <p className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
            El enlace no es válido o ha caducado. Pide uno nuevo o usa el código.
          </p>
        )}
        <LoginForm />
      </div>
    </main>
  );
}

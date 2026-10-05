"use client";
// Crear o cambiar la contraseña (desplegable al final de Inicio).
// autocomplete="new-password" hace que el iPhone ofrezca generar una contraseña segura
// y guardarla en el Llavero, para entrar después con Face ID.
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MIN_LENGTH = 8;

export default function PasswordForm({ email }: { email: string }) {
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (password.length < MIN_LENGTH) return setError(`Mínimo ${MIN_LENGTH} caracteres.`);
    if (password !== repeat) return setError("Las dos contraseñas no coinciden.");

    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(
        error.code === "same_password"
          ? "Es la misma contraseña que ya tenías."
          : error.code === "weak_password"
            ? "Contraseña demasiado débil. Usa una más larga o la que sugiere el iPhone."
            : "No se ha podido guardar. Si hace mucho que entraste, cierra sesión, vuelve a entrar e inténtalo otra vez.",
      );
      return;
    }
    setPassword("");
    setRepeat("");
    setMessage("Contraseña guardada. Ya puedes entrar con tu email y esta contraseña.");
  }

  const inputClass =
    "h-11 w-full rounded-control border border-line bg-background px-3 text-base outline-none focus:border-accent";

  return (
    <details className="rounded-card border border-line bg-surface">
      <summary className="flex h-11 cursor-pointer items-center px-3 text-sm text-muted">Crear o cambiar contraseña</summary>
      <form onSubmit={save} className="flex flex-col gap-2 px-3 pb-3">
        {/* Campo oculto con el email: el Llavero lo usa para asociar la contraseña a la cuenta */}
        <input type="email" name="email" autoComplete="username" value={email} readOnly hidden />
        <input
          type="password"
          name="new-password"
          autoComplete="new-password"
          placeholder="Nueva contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        <input
          type="password"
          name="repeat-password"
          autoComplete="new-password"
          placeholder="Repite la contraseña"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
          className={inputClass}
        />
        <button type="submit" disabled={loading} className="h-11 rounded-control bg-accent font-semibold text-on-accent disabled:opacity-50">
          {loading ? "Guardando…" : "Guardar contraseña"}
        </button>
        {message && <p className="text-sm text-accent">{message}</p>}
        {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
      </form>
    </details>
  );
}

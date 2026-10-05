"use client";
// Formulario de acceso. Dos formas de entrar:
//   1. Email + contraseña (la principal). Los campos llevan autocomplete="username" y
//      "current-password" para que el iPhone ofrezca la contraseña guardada en el Llavero
//      con Face ID. Funciona dentro de la app instalada, sin emails.
//   2. Enlace por email (alternativa, p. ej. si se olvida la contraseña). Con el correo por
//      defecto de Supabase solo llegan unos pocos emails por hora y el enlace se abre en Safari.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Traduce los errores de Supabase al pedir el email a un mensaje claro en español.
function sendErrorMessage(code: string | undefined, message: string) {
  // Mismo email pedido hace menos de 60 segundos ("...only request this after N seconds").
  if (/seconds/i.test(message)) {
    return "Acabas de pedir un email. Espera un minuto antes de pedir otro.";
  }
  // Límite de envíos del correo por defecto de Supabase (unos pocos por hora).
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit") {
    return "Demasiados emails enviados. Espera alrededor de una hora y pide solo uno.";
  }
  // El registro está cerrado y ese email no tiene cuenta (¿errata?).
  if (code === "otp_disabled" || code === "signup_disabled" || /signups not allowed/i.test(message)) {
    return "Este email no tiene acceso. Revisa que esté bien escrito.";
  }
  return "No se ha podido enviar el email. Inténtalo de nuevo más tarde.";
}

const inputClass =
  "h-12 w-full rounded-control border border-line bg-surface px-4 text-base outline-none focus:border-accent";
const buttonClass = "h-12 w-full rounded-control bg-accent font-semibold text-on-accent disabled:opacity-50";
const linkButtonClass = "h-11 text-sm text-muted underline";

export default function LoginForm() {
  const router = useRouter();
  // "password" = email + contraseña; "link" = pedir enlace; "sent" = enlace enviado.
  const [mode, setMode] = useState<"password" | "link" | "sent">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Entrar con email + contraseña.
  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setLoading(false);
      setError(
        error.code === "invalid_credentials"
          ? "Email o contraseña incorrectos."
          : "No se ha podido entrar. Revisa tu conexión e inténtalo de nuevo.",
      );
      return;
    }
    // refresh() hace que el servidor vea la nueva sesión antes de navegar.
    router.replace("/");
    router.refresh();
  }

  // Pedir un enlace de acceso por email.
  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback`, shouldCreateUser: false },
    });
    setLoading(false);
    if (error) {
      setError(sendErrorMessage(error.code, error.message));
      return;
    }
    setMode("sent");
  }

  const switchTo = (next: "password" | "link") => {
    setMode(next);
    setError(null);
  };

  // ---- Enlace enviado ----
  if (mode === "sent") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          Te hemos enviado un enlace a <strong>{email}</strong>. Ábrelo en este mismo navegador.
          Cuando entres, crea una contraseña (al final de Inicio) para no depender más de los emails.
        </p>
        <button type="button" onClick={() => switchTo("password")} className={linkButtonClass}>
          Volver a entrar con contraseña
        </button>
      </div>
    );
  }

  // ---- Pedir enlace por email ----
  if (mode === "link") {
    return (
      <form onSubmit={sendLink} className="flex flex-col gap-3">
        <input
          type="email"
          required
          autoComplete="username"
          inputMode="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? "Enviando…" : "Enviar enlace"}
        </button>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button type="button" onClick={() => switchTo("password")} className={linkButtonClass}>
          Entrar con contraseña
        </button>
      </form>
    );
  }

  // ---- Email + contraseña (por defecto) ----
  return (
    <form onSubmit={signInWithPassword} className="flex flex-col gap-3">
      <input
        type="email"
        name="email"
        required
        autoComplete="username"
        inputMode="email"
        placeholder="tu@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={inputClass}
      />
      <input
        type="password"
        name="password"
        required
        autoComplete="current-password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={inputClass}
      />
      <button type="submit" disabled={loading} className={buttonClass}>
        {loading ? "Entrando…" : "Entrar"}
      </button>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button type="button" onClick={() => switchTo("link")} className={linkButtonClass}>
        ¿Sin contraseña? Entrar con un enlace por email
      </button>
    </form>
  );
}

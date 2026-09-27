"use client";
// Formulario de acceso en dos pasos:
//   1. Escribes tu email → Supabase te envía un email con enlace mágico y código de 6 dígitos.
//   2. Pulsas el enlace en el mismo navegador, o escribes el código aquí.
//      Nota: con el correo por defecto de Supabase solo llega el enlace. En iPhone se entra
//      en Safari y DESPUÉS se añade a la pantalla de inicio (iOS copia la sesión a la app).
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

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Paso 1: pedir el email.
  async function sendEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) {
      setError(sendErrorMessage(error.code, error.message));
      return;
    }
    setStep("code");
  }

  // Paso 2: comprobar el código recibido.
  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    setLoading(false);
    if (error) {
      setError("Código incorrecto o caducado.");
      return;
    }
    // refresh() hace que el servidor vea la nueva sesión antes de navegar.
    router.replace("/");
    router.refresh();
  }

  const inputClass =
    "h-12 w-full rounded-control border border-line bg-surface px-4 text-base outline-none focus:border-accent";
  const buttonClass =
    "h-12 w-full rounded-control bg-accent font-semibold text-on-accent disabled:opacity-50";

  if (step === "email") {
    return (
      <form onSubmit={sendEmail} className="flex flex-col gap-3">
        <input
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? "Enviando…" : "Enviar"}
        </button>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </form>
    );
  }

  return (
    <form onSubmit={verifyCode} className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        Revisa <strong>{email}</strong> y pulsa el enlace del email desde este mismo navegador.
      </p>
      {/* El código solo llega si la plantilla del email incluye {{ .Token }}
          (requiere SMTP propio en Supabase). Mientras tanto, el campo es opcional. */}
      <p className="mt-2 text-xs text-muted">¿Te ha llegado un código? Escríbelo aquí:</p>
      <input
        type="text"
        required
        autoComplete="one-time-code"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={8}
        placeholder="Código"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className={`${inputClass} text-center text-xl tracking-[0.3em]`}
      />
      <button type="submit" disabled={loading} className={buttonClass}>
        {loading ? "Comprobando…" : "Entrar"}
      </button>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="button"
        onClick={() => {
          setStep("email");
          setCode("");
          setError(null);
        }}
        className="h-11 text-sm text-muted underline"
      >
        Usar otro email
      </button>
    </form>
  );
}

"use client";
// Formulario de acceso en dos pasos:
//   1. Escribes tu email → Supabase te envía un email con enlace mágico y código de 6 dígitos.
//   2. Escribes el código aquí (imprescindible en la app instalada del iPhone, que no comparte
//      sesión con Safari) o pulsas el enlace si estás en el mismo navegador.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
      setError("No se ha podido enviar el email. Revisa la dirección o espera un minuto.");
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
    "h-12 w-full rounded-xl border border-line bg-surface px-4 text-base outline-none focus:border-accent";
  const buttonClass =
    "h-12 w-full rounded-xl bg-accent font-semibold text-white disabled:opacity-50";

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
        Revisa <strong>{email}</strong>. Escribe el código del email o pulsa el enlace.
      </p>
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

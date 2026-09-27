"use client";
// Hoja inferior: panel que sube desde abajo sobre un fondo oscurecido (como los menús de iOS).
// Se cierra tocando fuera, con la X o con la tecla Escape.
import { useEffect } from "react";

export default function BottomSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // Cerrar con Escape (útil en el ordenador).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        // Los toques dentro del panel no deben cerrarlo.
        onClick={(e) => e.stopPropagation()}
        className="safe-bottom flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-card border-t border-line bg-background"
      >
        <div className="flex items-center justify-between border-b border-line py-1 pl-4 pr-1">
          <h2 className="font-serif text-lg">{title}</h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="flex size-11 items-center justify-center text-2xl leading-none text-muted"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-4 pb-4 pt-3">{children}</div>
      </div>
    </div>
  );
}

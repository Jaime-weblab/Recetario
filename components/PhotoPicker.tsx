"use client";
// Selector de la foto del plato dentro del formulario.
// Al tocarlo, el iPhone muestra su menú nativo (Hacer foto / Fototeca / Archivos).
// La foto se reduce y se sube en cuanto se elige; el formulario solo guarda su URL.
import { useRef, useState } from "react";
import { BowlIcon, TrashIcon } from "@/components/icons";
import { uploadRecipePhoto } from "@/lib/photos";

export default function PhotoPicker({
  value,
  onChange,
  onUploadingChange,
}: {
  value: string | null; // URL de la foto actual (o null)
  onChange: (url: string | null) => void;
  onUploadingChange: (uploading: boolean) => void; // para bloquear "Guardar" mientras sube
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    onUploadingChange(true);
    try {
      onChange(await uploadRecipePhoto(file));
    } catch (e) {
      console.error("uploadRecipePhoto", e);
      setError("No se ha podido subir la foto. Prueba con otra o inténtalo más tarde.");
    } finally {
      setUploading(false);
      onUploadingChange(false);
      // Vaciamos el campo para poder elegir otra vez la misma foto si hiciera falta.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      {/* Campo de archivo oculto: lo abre el botón grande de abajo */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label={value ? "Cambiar foto" : "Añadir foto"}
        // Sin foto: recuadro bajo, para no ocupar media pantalla. Con foto: proporción 4:3.
        className={`relative flex w-full items-center justify-center overflow-hidden rounded-card border border-dashed border-line bg-surface text-muted ${
          value ? "aspect-[4/3]" : "h-28"
        }`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- foto ya redimensionada
          <img src={value} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-2 text-sm">
            <BowlIcon className="size-8 text-accent" />
            Añadir foto del plato
          </span>
        )}
        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-background/70 text-sm text-foreground">
            Subiendo foto…
          </span>
        )}
      </button>

      {/* Acciones cuando ya hay foto */}
      {value && !uploading && (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="h-11 flex-1 rounded-control border border-line text-sm"
          >
            Cambiar foto
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-control border border-line text-sm text-muted"
          >
            <TrashIcon className="size-4" />
            Quitar foto
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}

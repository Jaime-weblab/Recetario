"use client";
// Pantalla de importación de recetas (Fase 1B), en dos pasos:
//   1. Elegir origen:
//      - "Pegar lo copiado": lee el portapapeles y decide solo (enlace → web, texto → texto, imagen → fotos).
//      - Pestañas: Web (enlace), Texto (pegar a mano el texto de la receta) y Fotos (1 a 3: libro, capturas).
//   2. Claude la convierte (en el servidor) y se abre el formulario de receta YA RELLENO para revisar.
// Nada se guarda hasta que el usuario pulsa "Guardar receta" en el formulario.
import { useEffect, useRef, useState } from "react";
import RecipeForm from "@/components/RecipeForm";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { ClipboardError, imageFromPasteEvent, isUrl, readClipboard } from "@/lib/clipboard";
import { blobToBase64, resizeImage } from "@/lib/photos";
import type { RecipeInput } from "@/types/recipe";

const MAX_PHOTOS = 3;
// Las fotos de texto se reducen menos que las de platos, para que la letra siga siendo legible.
const TEXT_PHOTO_MAX_SIDE = 2000;

type Mode = "web" | "texto" | "fotos";
const MODE_LABELS: Record<Mode, string> = { web: "Web", texto: "Texto", fotos: "Fotos" };

// Clases comunes.
const fieldClass =
  "w-full rounded-control border border-line bg-surface px-3 text-base outline-none focus:border-accent";
const primaryButton =
  "h-12 w-full rounded-control bg-accent font-semibold text-on-accent disabled:opacity-50";

export default function RecipeImporter({ ingredientNames }: { ingredientNames: string[] }) {
  const [mode, setMode] = useState<Mode>("web");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<RecipeInput | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Envía la petición al servidor y, si va bien, muestra el formulario relleno.
  async function runImport(endpoint: string, payload: unknown) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as { recipe?: RecipeInput; error?: string };
      if (!response.ok || !data.recipe) {
        setError(data.error ?? "No se ha podido importar la receta.");
        return;
      }
      setRecipe(data.recipe);
      window.scrollTo({ top: 0 });
    } catch {
      setError("Sin conexión con el servidor. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const importFromWeb = (link: string) => runImport("/api/importar/web", { url: link });
  const importFromText = (content: string) => runImport("/api/importar/texto", { text: content });

  async function importFromPhotos() {
    setLoading(true);
    setError(null);
    try {
      // Reducimos cada foto en el móvil antes de enviarla (más rápido y más barato).
      const images = await Promise.all(
        photos.map(async ({ file }) => ({
          media_type: "image/jpeg",
          data: await blobToBase64(await resizeImage(file, TEXT_PHOTO_MAX_SIDE)),
        })),
      );
      await runImport("/api/importar/fotos", { images });
    } catch {
      setError("No se han podido preparar las fotos. Prueba con otras.");
      setLoading(false);
    }
  }

  // Añade fotos (elegidas o pegadas), hasta el máximo, con una miniatura para verlas.
  function addPhotos(files: File[]) {
    const added = files.map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setPhotos((current) => [...current, ...added].slice(0, MAX_PHOTOS));
    if (fileInput.current) fileInput.current.value = "";
  }

  // "Pegar lo copiado": decide qué hacer según lo que haya en el portapapeles.
  async function pasteAnything() {
    setError(null);
    try {
      const content = await readClipboard();
      if (content.kind === "image") {
        // Imagen: a la pestaña de fotos (por si hay que añadir más páginas antes de importar).
        setMode("fotos");
        addPhotos([content.file]);
      } else if (isUrl(content.text)) {
        // Enlace: se importa directamente.
        setMode("web");
        setUrl(content.text);
        await importFromWeb(content.text);
      } else {
        // Texto: se importa directamente.
        setMode("texto");
        setText(content.text);
        await importFromText(content.text);
      }
    } catch (e) {
      setError(e instanceof ClipboardError ? e.message : "No se ha podido pegar.");
    }
  }

  // En el ordenador: Ctrl+V / Cmd+V con la pestaña de fotos abierta añade la imagen.
  useEffect(() => {
    if (mode !== "fotos" || recipe) return;
    const onPaste = (event: ClipboardEvent) => {
      const file = imageFromPasteEvent(event);
      if (file) {
        event.preventDefault();
        addPhotos([file]);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [mode, recipe]);

  // ---- Paso 2: receta importada → formulario relleno para revisar ----
  if (recipe) {
    return (
      <div className="pt-4">
        <div className="rounded-card border border-highlight/60 bg-highlight/10 p-3 text-sm">
          <p className="font-medium">Receta importada. Revísala antes de guardar.</p>
          <p className="mt-1 text-muted">Comprueba sobre todo las cantidades y unidades de los ingredientes.</p>
          <button type="button" onClick={() => setRecipe(null)} className="mt-2 h-11 text-accent underline">
            Importar otra
          </button>
        </div>
        <RecipeForm initial={recipe} ingredientNames={ingredientNames} />
      </div>
    );
  }

  // ---- Paso 1: elegir origen ----
  const tabClass = (active: boolean) =>
    `h-11 flex-1 rounded-control text-sm ${active ? "bg-accent font-semibold text-on-accent" : "text-muted"}`;

  return (
    <div className="flex flex-col gap-5 pt-4">
      {/* Atajo: pegar lo que se haya copiado (enlace, texto o imagen) */}
      <div>
        <button type="button" disabled={loading} onClick={pasteAnything} className={primaryButton}>
          Pegar lo copiado
        </button>
        <p className="mt-1 text-center text-xs text-muted">Un enlace, el texto de una receta o una imagen</p>
      </div>

      <p className="text-center text-sm text-muted">o elige el origen:</p>

      {/* Pestañas Web / Texto / Fotos */}
      <div className="-mt-3 flex gap-1 rounded-control border border-line bg-surface p-1">
        {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
          <button key={m} type="button" className={tabClass(mode === m)} onClick={() => setMode(m)}>
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {mode === "web" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            importFromWeb(url);
          }}
          className="flex flex-col gap-3"
        >
          <label htmlFor="url" className="text-sm text-muted">Enlace de la receta</label>
          <input
            id="url"
            type="url"
            inputMode="url"
            required
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={`${fieldClass} h-11`}
          />
          <button type="submit" disabled={loading} className={primaryButton}>
            {loading ? "Leyendo la receta…" : "Importar"}
          </button>
        </form>
      )}

      {mode === "texto" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            importFromText(text);
          }}
          className="flex flex-col gap-3"
        >
          <label htmlFor="text" className="text-sm text-muted">
            Pega aquí el texto de la receta (mantén pulsado → Pegar)
          </label>
          <textarea
            id="text"
            rows={8}
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ingredientes, pasos…"
            className={`${fieldClass} py-2`}
          />
          <button type="submit" disabled={loading || text.trim().length < 20} className={primaryButton}>
            {loading ? "Leyendo la receta…" : "Importar"}
          </button>
        </form>
      )}

      {mode === "fotos" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Haz, elige o pega hasta {MAX_PHOTOS} fotos de la receta (páginas de un libro, capturas…), en orden.
          </p>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => addPhotos(Array.from(e.target.files ?? []))}
          />
          {/* Miniaturas de las fotos elegidas */}
          {photos.length > 0 && (
            <ul className="grid grid-cols-3 gap-2">
              {photos.map((photo, index) => (
                <li key={photo.preview} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local */}
                  <img src={photo.preview} alt={`Foto ${index + 1}`} className="aspect-[3/4] w-full rounded-control object-cover" />
                  <button
                    type="button"
                    aria-label={`Quitar foto ${index + 1}`}
                    onClick={() => setPhotos((current) => current.filter((p) => p !== photo))}
                    className="absolute right-0 top-0 flex size-11 items-center justify-center text-white drop-shadow"
                  >
                    <TrashIcon className="size-5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {photos.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-control border border-dashed border-line text-sm text-accent"
            >
              <PlusIcon className="size-4" />
              {photos.length === 0 ? "Hacer o elegir fotos" : "Añadir otra foto"}
            </button>
          )}
          <button type="button" disabled={loading || photos.length === 0} onClick={importFromPhotos} className={primaryButton}>
            {loading ? "Leyendo la receta…" : "Importar"}
          </button>
        </div>
      )}

      {loading && <p className="text-center text-sm text-muted">Puede tardar entre 10 y 30 segundos.</p>}
      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}

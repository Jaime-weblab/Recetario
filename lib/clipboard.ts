// Leer del portapapeles (copiar + pegar). Solo en el NAVEGADOR.
// En iPhone, al llamarlo aparece la burbuja "Pegar" del sistema, que el usuario debe tocar
// (es una protección de iOS). Debe llamarse directamente al pulsar un botón.

// Error con un mensaje apto para el usuario.
export class ClipboardError extends Error {}

// Lo que haya copiado: una imagen o un texto (que puede ser un enlace).
export type ClipboardContent = { kind: "image"; file: File } | { kind: "text"; text: string };

// Lee el portapapeles: prioriza la imagen; si no hay, devuelve el texto.
export async function readClipboard(): Promise<ClipboardContent> {
  // 1. API completa (imágenes y texto). En iOS existe desde la versión 13.4.
  if (navigator.clipboard?.read) {
    let items: ClipboardItems | null = null;
    try {
      items = await navigator.clipboard.read();
    } catch {
      items = null; // denegado o no disponible: probamos con solo texto
    }
    if (items) {
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith("image/"));
        if (type) {
          const blob = await item.getType(type);
          return { kind: "image", file: new File([blob], `pegada.${type.split("/")[1] ?? "png"}`, { type }) };
        }
      }
      for (const item of items) {
        const type = item.types.find((t) => t === "text/plain" || t === "text/uri-list");
        if (type) {
          const text = (await (await item.getType(type)).text()).trim();
          if (text) return { kind: "text", text };
        }
      }
    }
  }
  // 2. Solo texto (más compatible).
  if (navigator.clipboard?.readText) {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) return { kind: "text", text };
    } catch {
      // seguimos al mensaje de error
    }
  }
  throw new ClipboardError(
    "No se ha podido leer lo copiado. Toca «Pegar» cuando aparezca, o pega a mano en la pestaña Texto.",
  );
}

// Solo imágenes (para la foto del plato).
export async function readClipboardImage(): Promise<File> {
  const content = await readClipboard();
  if (content.kind !== "image") {
    throw new ClipboardError("Lo copiado no es una imagen. Mantén pulsada la imagen y elige «Copiar».");
  }
  return content.file;
}

// ¿Es el texto un único enlace web?
export function isUrl(text: string): boolean {
  return /^https?:\/\/\S+$/i.test(text.trim());
}

// Imagen de un evento "paste" (Ctrl+V / Cmd+V en el ordenador), o null si no lleva imagen.
export function imageFromPasteEvent(event: ClipboardEvent): File | null {
  for (const item of Array.from(event.clipboardData?.items ?? [])) {
    if (item.kind === "file" && item.type.startsWith("image/")) return item.getAsFile();
  }
  return null;
}

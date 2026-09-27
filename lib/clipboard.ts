// Leer una imagen del portapapeles (copiar + pegar). Solo en el NAVEGADOR.
// En iPhone, al llamarlo aparece la burbuja "Pegar" del sistema, que el usuario debe tocar
// (es una protección de iOS). Debe llamarse directamente al pulsar un botón.

// Error con un mensaje apto para el usuario.
export class ClipboardError extends Error {}

// Devuelve la imagen copiada como archivo, o lanza ClipboardError con el motivo.
export async function readClipboardImage(): Promise<File> {
  if (!navigator.clipboard?.read) {
    throw new ClipboardError("Este navegador no permite pegar imágenes. Guarda la imagen y elígela de la fototeca.");
  }
  let items: ClipboardItems;
  try {
    items = await navigator.clipboard.read();
  } catch {
    throw new ClipboardError("No se ha podido leer el portapapeles. Toca «Pegar» cuando aparezca.");
  }
  for (const item of items) {
    const type = item.types.find((t) => t.startsWith("image/"));
    if (type) {
      const blob = await item.getType(type);
      return new File([blob], `pegada.${type.split("/")[1] ?? "png"}`, { type });
    }
  }
  throw new ClipboardError("No hay ninguna imagen copiada. Copia una imagen o captura y vuelve a intentarlo.");
}

// Imagen de un evento "paste" (Ctrl+V / Cmd+V en el ordenador), o null si no lleva imagen.
export function imageFromPasteEvent(event: ClipboardEvent): File | null {
  for (const item of Array.from(event.clipboardData?.items ?? [])) {
    if (item.kind === "file" && item.type.startsWith("image/")) return item.getAsFile();
  }
  return null;
}

// Fotos de recetas en Supabase Storage: reducir y subir. Se usa en el NAVEGADOR (formulario).
// (Para borrar fotos desde el servidor, ver lib/photo-paths.ts y las acciones de recetas.)
import { createClient } from "@/lib/supabase/client";
import { PHOTO_BUCKET } from "@/lib/photo-paths";

// Tamaño máximo del lado largo y calidad JPEG: buen equilibrio entre nitidez y peso (~200-400 KB).
const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.82;

// Reduce una imagen (p. ej. la foto de la cámara del iPhone, de 4000 px y varios MB)
// a `maxSide` px (por defecto MAX_SIDE) y la convierte a JPEG. Todo ocurre en el propio móvil, sin librerías.
export async function resizeImage(file: File, maxSide = MAX_SIDE): Promise<Blob> {
  // Cargamos la imagen en un <img> (el navegador ya la gira según la orientación de la cámara).
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();

    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);

    // La "pintamos" en un lienzo más pequeño y la exportamos como JPEG.
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se puede procesar la imagen en este navegador.");
    ctx.drawImage(img, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("No se ha podido convertir la imagen."))),
        "image/jpeg",
        JPEG_QUALITY,
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Nombre de archivo aleatorio (32 caracteres hexadecimales).
// No usamos crypto.randomUUID() porque no existe al probar por http://<IP-del-PC> desde el móvil.
function randomName(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Reduce y sube una foto a la carpeta del usuario. Devuelve su URL pública.
export async function uploadRecipePhoto(file: File): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) throw new Error("No has iniciado sesión.");

  const blob = await resizeImage(file);
  // Nombre aleatorio e imposible de adivinar, dentro de la carpeta del usuario (lo exige la seguridad).
  const path = `${userId}/${randomName()}.jpg`;

  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, {
    contentType: "image/jpeg",
    cacheControl: "31536000", // el archivo nunca cambia (cada foto nueva tiene otro nombre)
  });
  if (error) throw new Error(error.message);

  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

// Convierte una imagen (Blob) a texto base64 sin la cabecera "data:...;base64,",
// que es el formato en el que se envían las fotos a Claude.
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

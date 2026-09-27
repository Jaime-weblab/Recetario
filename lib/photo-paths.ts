// Utilidades de rutas de fotos, válidas en navegador y servidor (no usan ningún cliente de Supabase).

// Bucket de Storage donde se guardan las fotos de recetas.
export const PHOTO_BUCKET = "recipe-photos";

// De una URL pública ".../object/public/recipe-photos/<id>/<foto>.jpg" saca "<id>/<foto>.jpg".
// Devuelve null si la URL no es de nuestro bucket (p. ej. una imagen externa).
export function photoPathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/object/public/${PHOTO_BUCKET}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length));
}

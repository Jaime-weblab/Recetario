// Descarga una página web de receta y prepara su contenido para Claude. SOLO SERVIDOR.
// Muchas webs de recetas incluyen la receta en un formato estándar legible por máquinas
// (JSON-LD de schema.org, tipo "Recipe"). Si existe, usamos eso: es más fiable y más barato.
// Si no, usamos el texto visible de la página.
import { AiError } from "@/lib/ai";

const TIMEOUT_MS = 15_000;
const MAX_HTML_BYTES = 3 * 1024 * 1024; // 3 MB de HTML como mucho
const MAX_TEXT_CHARS = 60_000; // texto que se envía a Claude si no hay JSON-LD

export type WebPage = {
  url: string; // URL final (tras redirecciones)
  title: string;
  recipeJson: unknown | null; // bloque schema.org Recipe si lo hay
  text: string; // texto visible (recortado)
  imageUrl: string | null; // foto del plato (de la receta o de la etiqueta og:image)
};

// Comprueba que la URL es una web pública normal (evita que se usen direcciones internas).
export function checkUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new AiError("El enlace no es válido.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new AiError("El enlace debe empezar por http:// o https://.");
  }
  const host = url.hostname.toLowerCase();
  const isPrivate =
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) ||
    host.startsWith("[");
  if (isPrivate) throw new AiError("Ese enlace no está permitido.");
  return url;
}

// fetch con límite de tiempo.
async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...init,
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      // Algunas webs rechazan peticiones que no parecen de un navegador.
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      ...init.headers,
    },
  });
}

// Descarga la página y extrae lo que nos interesa.
export async function fetchRecipePage(rawUrl: string): Promise<WebPage> {
  const url = checkUrl(rawUrl);

  let response: Response;
  try {
    response = await fetchWithTimeout(url.toString(), { headers: { Accept: "text/html" } });
  } catch {
    throw new AiError("No se ha podido abrir la web (tarda demasiado o no responde).");
  }
  if (!response.ok) {
    throw new AiError(
      response.status === 403
        ? "Esa web no permite que la leamos. Prueba a hacer una captura y usar «Desde fotos»."
        : `La web ha respondido con un error (${response.status}).`,
    );
  }
  const html = (await response.text()).slice(0, MAX_HTML_BYTES);
  const finalUrl = response.url || url.toString();

  const recipeJson = findRecipeJsonLd(html);
  return {
    url: finalUrl,
    title: decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? ""),
    recipeJson,
    text: htmlToText(html).slice(0, MAX_TEXT_CHARS),
    imageUrl: absoluteUrl(imageFromRecipe(recipeJson) ?? metaContent(html, "og:image"), finalUrl),
  };
}

// ---- Búsqueda del bloque schema.org "Recipe" dentro de <script type="application/ld+json"> ----
function findRecipeJsonLd(html: string): unknown | null {
  const blocks = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const block of blocks) {
    try {
      const found = searchRecipe(JSON.parse(block[1].trim()));
      if (found) return found;
    } catch {
      // Bloque mal formado: lo ignoramos y seguimos con el siguiente.
    }
  }
  return null;
}

// Recorre el JSON (puede venir como lista o dentro de "@graph") buscando un objeto de tipo Recipe.
function searchRecipe(node: unknown): unknown | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = searchRecipe(item);
      if (found) return found;
    }
    return null;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const type = obj["@type"];
    if (type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"))) return obj;
    if (obj["@graph"]) return searchRecipe(obj["@graph"]);
  }
  return null;
}

// La imagen en schema.org puede ser un texto, una lista o un objeto {url}.
function imageFromRecipe(recipe: unknown): string | null {
  if (!recipe || typeof recipe !== "object") return null;
  let image = (recipe as Record<string, unknown>).image;
  if (Array.isArray(image)) image = image[0];
  if (typeof image === "string") return image;
  if (image && typeof image === "object" && typeof (image as { url?: unknown }).url === "string") {
    return (image as { url: string }).url;
  }
  return null;
}

// Contenido de una etiqueta <meta property="og:image" content="...">.
function metaContent(html: string, property: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]*content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${property}["']`,
    "i",
  );
  const m = html.match(re);
  return m ? decodeEntities(m[1] ?? m[2]) : null;
}

// Convierte una URL relativa ("/img/foto.jpg") en absoluta.
function absoluteUrl(src: string | null, base: string): string | null {
  if (!src) return null;
  try {
    return new URL(src, base).toString();
  } catch {
    return null;
  }
}

// Texto visible aproximado: quita scripts, estilos y etiquetas, y compacta espacios.
function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|header|footer|nav)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

// Traduce las entidades HTML más habituales (&amp; &quot; &#39; &nbsp; &#233;…).
function decodeEntities(text: string): string {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return text.replace(/&(#x?[0-9a-f]+|\w+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    return named[code.toLowerCase()] ?? match;
  });
}

// ---- Foto del plato: se descarga para copiarla a nuestro almacenamiento ----
const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // mismo límite que el bucket

// Devuelve la imagen como bytes + tipo, o null si no se puede (no es grave: la receta se importa sin foto).
export async function downloadImage(imageUrl: string): Promise<{ bytes: ArrayBuffer; type: string; ext: string } | null> {
  try {
    checkUrl(imageUrl);
    const response = await fetchWithTimeout(imageUrl, { headers: { Accept: "image/*" } });
    if (!response.ok) return null;
    const type = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const ext = IMAGE_TYPES[type];
    if (!ext) return null;
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > MAX_IMAGE_BYTES) return null;
    return { bytes, type, ext };
  } catch {
    return null;
  }
}

// Manifest de la PWA: le dice al móvil cómo "instalar" la web como una app
// (nombre, icono, colores, abrir a pantalla completa). Next lo sirve en /manifest.webmanifest.
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Recetario",
    short_name: "Recetario",
    description: "Mis recetas, el menú de la semana y la lista de la compra.",
    lang: "es",
    start_url: "/",
    display: "standalone", // sin barra del navegador
    orientation: "portrait",
    background_color: "#f1efe4",
    theme_color: "#5f6f2a",
    // Iconos generados con scripts/generate-icons.mjs
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

// Layout raíz: envuelve TODAS las páginas. Define idioma, fuente, metadatos y
// las etiquetas que necesita iOS para que la app instalada se vea a pantalla completa.
import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // "%s · Recetario" → cada página puede poner su propio título delante.
  title: { default: "Recetario", template: "%s · Recetario" },
  description: "Mis recetas, el menú de la semana y la lista de la compra.",
  // Etiquetas específicas de iOS para "Añadir a pantalla de inicio".
  appleWebApp: {
    capable: true, // abrir sin la barra de Safari
    title: "Recetario", // nombre bajo el icono
    statusBarStyle: "default", // barra de estado (hora, batería) sobre fondo propio
  },
  formatDetection: { telephone: false }, // que iOS no convierta números en enlaces de llamada
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // ocupa toda la pantalla; los márgenes los ponemos con safe-top/safe-bottom
  // Color de la barra del sistema, según modo claro/oscuro (igual que --background).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1efe4" },
    { media: "(prefers-color-scheme: dark)", color: "#15160f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}

"use client";
// Barra de navegación inferior con 3 pestañas: Inicio · Recetas · Lista de la compra.
// Es "use client" porque necesita saber en qué ruta estamos para resaltar la pestaña activa.
import Link from "next/link";
import { usePathname } from "next/navigation";

// Iconos dibujados en SVG (sin librerías). Heredan el color del texto (currentColor).
function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
    </svg>
  );
}
function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z" />
      <path d="M4 21a2 2 0 0 1 2-2h13v2H6" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="m3.5 6 1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2" />
    </svg>
  );
}

const TABS = [
  { href: "/", label: "Inicio", Icon: HomeIcon },
  { href: "/recetas", label: "Recetas", Icon: BookIcon },
  { href: "/lista", label: "Compra", Icon: ListIcon },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Una pestaña está activa si la ruta coincide (Inicio solo con "/" exacto).
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface/95 backdrop-blur">
      <ul className="mx-auto flex max-w-md">
        {TABS.map(({ href, label, Icon }) => (
          <li key={href} className="flex-1">
            <Link
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] ${
                isActive(href) ? "text-accent" : "text-muted"
              }`}
            >
              <Icon />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

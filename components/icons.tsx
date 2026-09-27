// Iconos de la app dibujados en SVG (sin librerías). Heredan el color del texto (currentColor)
// y su tamaño se controla con className (p. ej. "size-5").
type IconProps = { className?: string };

// Base común: trazo fino y redondeado, como los de la barra inferior.
function Svg({ className = "size-5", children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

// Cuenco (se usa cuando una receta no tiene foto).
export function BowlIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 11h18" />
      <path d="M4 11a8 7 0 0 0 16 0" />
      <path d="M9 21h6" />
      <path d="M9 4c-.8 1 .8 2 0 3M12 3c-.8 1 .8 2 0 3M15 4c-.8 1 .8 2 0 3" />
    </Svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </Svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m15 6-6 6 6 6" />
    </Svg>
  );
}

export function ArrowUpIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </Svg>
  );
}

export function ArrowDownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </Svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </Svg>
  );
}

// Hoja (marca de receta vegetariana).
export function LeafIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14Z" />
      <path d="M5 19 13 11" />
    </Svg>
  );
}

// Estrella: rellena si `filled` (receta favorita).
export function StarIcon({ className = "size-5", filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8Z" />
    </svg>
  );
}

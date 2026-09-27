// Cabecera de cada pantalla: título con serifa, línea inferior y, opcionalmente,
// un elemento a la derecha (p. ej. el botón "+" del listado de recetas).
export default function PageHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-2 border-b border-line pb-3 pt-6">
      <h1 className="font-serif text-3xl">{title}</h1>
      {action}
    </div>
  );
}

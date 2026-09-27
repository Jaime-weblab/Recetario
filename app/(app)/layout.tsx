// Layout de la parte PRIVADA de la app (carpeta "(app)": el paréntesis no aparece en la URL).
// Añade la barra inferior y deja hueco abajo para que no tape el contenido.
// La protección (redirigir a /login si no hay sesión) la hace proxy.ts antes de llegar aquí.
import BottomNav from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* pb = altura de la barra (3.5rem) + margen seguro inferior del iPhone */}
      <div className="safe-top min-h-dvh pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-md px-4">{children}</div>
      </div>
      <BottomNav />
    </>
  );
}

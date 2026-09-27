// Pantalla de Recetas. Se desarrollará en la Fase 1.
import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";

export const metadata: Metadata = { title: "Recetas" };

export default function RecipesPage() {
  return (
    <>
      <PageHeader title="Recetas" />
      <p className="text-muted">Próximamente (Fase 1).</p>
    </>
  );
}

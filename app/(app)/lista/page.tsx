// Pantalla de Lista de la compra. Se desarrollará en la Fase 3.
import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";

export const metadata: Metadata = { title: "Lista de la compra" };

export default function ShoppingListPage() {
  return (
    <>
      <PageHeader title="Lista de la compra" />
      <p className="text-muted">Próximamente (Fase 3).</p>
    </>
  );
}

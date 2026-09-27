// Pantalla "Importar receta" (Fase 1B): desde una web o desde fotos, con Claude.
import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import RecipeImporter from "@/components/RecipeImporter";
import { listIngredientNames } from "@/lib/recipes";

export const metadata: Metadata = { title: "Importar receta" };

export default async function ImportRecipePage() {
  const ingredientNames = await listIngredientNames();
  return (
    <>
      <PageHeader title="Importar receta" />
      <RecipeImporter ingredientNames={ingredientNames} />
    </>
  );
}

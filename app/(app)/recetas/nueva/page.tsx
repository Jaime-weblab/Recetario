// Pantalla "Nueva receta": el formulario vacío.
import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import RecipeForm from "@/components/RecipeForm";
import { listIngredientNames } from "@/lib/recipes";

export const metadata: Metadata = { title: "Nueva receta" };

export default async function NewRecipePage() {
  const ingredientNames = await listIngredientNames();
  return (
    <>
      <PageHeader title="Nueva receta" />
      <RecipeForm ingredientNames={ingredientNames} />
    </>
  );
}

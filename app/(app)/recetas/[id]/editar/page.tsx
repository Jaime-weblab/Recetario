// Pantalla "Editar receta": el mismo formulario, relleno con la receta guardada.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import RecipeForm from "@/components/RecipeForm";
import { getRecipe, listIngredientNames } from "@/lib/recipes";
import type { RecipeInput, RecipeWithDetails } from "@/types/recipe";

export const metadata: Metadata = { title: "Editar receta" };

// Convierte la receta de la base de datos al formato que usa el formulario.
function toInput(recipe: RecipeWithDetails): RecipeInput {
  return {
    title: recipe.title,
    description: recipe.description ?? "",
    servings: recipe.servings,
    prep_minutes: recipe.prep_minutes,
    cook_minutes: recipe.cook_minutes,
    tags: recipe.tags,
    is_vegetarian: recipe.is_vegetarian,
    main_ingredient: recipe.main_ingredient ?? "",
    dish_type: recipe.dish_type,
    photo_url: recipe.photo_url,
    source_url: recipe.source_url ?? "",
    notes: recipe.notes ?? "",
    ingredients: recipe.ingredients.map((line) => ({
      name: line.ingredient.name,
      quantity: line.quantity,
      unit: line.unit,
      note: line.note ?? "",
    })),
    steps: recipe.steps.map((s) => s.text),
  };
}

export default async function EditRecipePage({ params }: PageProps<"/recetas/[id]/editar">) {
  const { id } = await params;
  const [recipe, ingredientNames] = await Promise.all([getRecipe(id), listIngredientNames()]);
  if (!recipe) notFound();

  return (
    <>
      <PageHeader title="Editar receta" />
      <RecipeForm recipeId={recipe.id} initial={toInput(recipe)} ingredientNames={ingredientNames} />
    </>
  );
}

// Conversión de una receta (texto de una web o fotos) a nuestro formato estructurado usando Claude.
// SOLO SERVIDOR: usa ANTHROPIC_API_KEY, que nunca debe llegar al navegador.
import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { AI_MODEL, AiError, getAnthropic, toAiError } from "@/lib/ai";
import { DISH_TYPES, UNITS, type RecipeInput } from "@/types/recipe";

// ---- Forma EXACTA que debe tener la respuesta de Claude ----
// El SDK obliga a Claude a responder con este esquema y lo valida al recibirlo.
const ImportedRecipeSchema = z.object({
  found: z.boolean().describe("false si el contenido no contiene ninguna receta"),
  title: z.string(),
  description: z.string().nullable(),
  servings: z.number().int().nullable(),
  prep_minutes: z.number().int().nullable(),
  cook_minutes: z.number().int().nullable(),
  dish_type: z.enum(DISH_TYPES).nullable(),
  is_vegetarian: z.boolean(),
  main_ingredient: z.string().nullable(),
  tags: z.array(z.string()),
  ingredients: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().nullable(),
      unit: z.enum(UNITS).nullable(),
      note: z.string().nullable(),
    }),
  ),
  steps: z.array(z.string()),
  notes: z.string().nullable(),
});
type ImportedRecipe = z.infer<typeof ImportedRecipeSchema>;

// Instrucciones fijas para Claude (en español, como la app).
const SYSTEM_PROMPT = `Eres un asistente que pasa recetas de cocina a un formato estructurado para un recetario personal en español.

Reglas:
- Todo el texto en español de España. Si la receta está en otro idioma, tradúcela.
- Ingredientes: una entrada por ingrediente.
  - "name": nombre corto y común del ingrediente, en minúscula y sin cantidades ni preparación (ej. "cebolla", "garbanzos cocidos", "aceite de oliva").
  - "quantity": número (convierte fracciones a decimales: 1/2 → 0.5). null si no hay cantidad ("sal al gusto").
  - "unit": SOLO una de estas: g, kg, ml, l, ud, cda (cucharada), cdta (cucharadita), pizca. Convierte al sistema métrico:
    tazas → ml (1 taza = 240 ml) o g si es un sólido conocido (harina ~120 g/taza, azúcar ~200 g/taza, arroz ~185 g/taza);
    oz → g (28 g); lb → g (454 g); fl oz → ml (30 ml); "un diente", "una cebolla" → ud. null si no hay cantidad.
  - "note": preparación o aclaración ("picada", "en dados", "al gusto", "opcional"). null si no hay.
- Pasos: una entrada por paso, sin numerar, claros y fieles al original. No inventes pasos.
- servings: número de raciones si aparece; si no, estímalo razonablemente o null.
- prep_minutes / cook_minutes: en minutos si aparecen o se deducen claramente; si no, null.
- dish_type: el que mejor encaje (legumbre, pasta, arroz, verdura, huevo, pescado, carne, sopa = sopa o crema, ensalada, otro).
- is_vegetarian: true si no lleva carne, pescado ni marisco (huevo y lácteos sí se permiten), ni caldos de carne o pescado.
- main_ingredient: el ingrediente protagonista en una o dos palabras.
- tags: de 0 a 3 etiquetas útiles en minúscula (ej. "rápida", "horno", "tupper"). Sin repetir el tipo de plato.
- description: una frase breve si el original la tiene; si no, null.
- notes: trucos, variantes o conservación que aparezcan en el original; si no, null.
- Si el contenido no contiene una receta, devuelve found=false y deja el resto vacío.
- No inventes datos que no estén en el contenido, salvo las conversiones de unidades y las estimaciones indicadas.`;

// Llama a Claude con el contenido (texto y/o imágenes) y devuelve la receta en formato RecipeInput.
export async function extractRecipe(
  content: Anthropic.ContentBlockParam[],
  extra: { sourceUrl?: string; photoUrl?: string | null } = {},
): Promise<RecipeInput> {
  const client = getAnthropic();

  let response;
  try {
    response = await client.messages.parse({
      model: AI_MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
      output_config: {
        format: zodOutputFormat(ImportedRecipeSchema),
        effort: "medium", // extraer una receta no requiere el máximo razonamiento (más barato y rápido)
      },
    });
  } catch (error) {
    throw toAiError(error);
  }

  if (response.stop_reason === "refusal") {
    throw new AiError("Claude no ha podido procesar este contenido.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new AiError("La receta es demasiado larga para importarla de una vez.");
  }
  const parsed = response.parsed_output;
  if (!parsed) throw new AiError("La respuesta de Claude no tenía el formato esperado.");
  if (!parsed.found) throw new AiError("No se ha encontrado ninguna receta.");

  return toRecipeInput(parsed, extra);
}

// Pasa la respuesta de Claude al formato del formulario (RecipeInput).
function toRecipeInput(
  r: ImportedRecipe,
  extra: { sourceUrl?: string; photoUrl?: string | null },
): RecipeInput {
  const positive = (n: number | null) => (n != null && n > 0 ? n : null);
  return {
    title: r.title.trim(),
    description: r.description ?? "",
    servings: Math.max(1, Math.round(r.servings ?? 2)),
    prep_minutes: positive(r.prep_minutes),
    cook_minutes: positive(r.cook_minutes),
    tags: r.tags.map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 3),
    is_vegetarian: r.is_vegetarian,
    main_ingredient: r.main_ingredient ?? "",
    dish_type: r.dish_type,
    photo_url: extra.photoUrl ?? null,
    source_url: extra.sourceUrl ?? "",
    notes: r.notes ?? "",
    ingredients: r.ingredients
      .filter((i) => i.name.trim())
      .map((i) => ({
        name: i.name.trim(),
        quantity: positive(i.quantity),
        unit: i.unit,
        note: i.note ?? "",
      })),
    steps: r.steps.map((s) => s.trim()).filter(Boolean),
  };
}

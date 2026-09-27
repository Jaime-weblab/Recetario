// Clasificación de ingredientes en secciones del súper con Claude. SOLO SERVIDOR.
// Se usa al generar la lista de la compra para los ingredientes que aún están en "otros".
// Es barata (solo nombres) y el resultado se guarda en el catálogo, así que cada
// ingrediente se clasifica una sola vez.
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { AI_MODEL, getAnthropic } from "@/lib/ai";
import { SECTIONS, type ShoppingSection } from "@/types/shopping";

const SYSTEM_PROMPT = `Clasificas ingredientes de cocina según la sección de un supermercado español donde se compran:
- fruteria: frutas, verduras, hortalizas, setas, hierbas frescas
- carniceria: carnes y embutidos frescos
- pescaderia: pescado y marisco
- lacteos: leche, quesos, yogures, nata, mantequilla, huevos
- despensa: legumbres, pasta, arroz, harinas, aceites, vinagres, especias, sal, azúcar, conservas, caldos, frutos secos, pan
- congelados: productos congelados
- otros: lo que no encaje en ninguna
Devuelve una entrada por cada ingrediente, con el nombre exactamente como te lo dan.`;

// Devuelve un mapa nombre → sección. Si Claude falla, devuelve un mapa vacío (no es grave:
// los ingredientes siguen en "otros" y se pueden mover a mano).
export async function classifyIngredients(names: string[]): Promise<Map<string, ShoppingSection>> {
  const result = new Map<string, ShoppingSection>();
  if (names.length === 0) return result;

  const Schema = z.object({
    items: z.array(z.object({ name: z.enum(names as [string, ...string[]]), section: z.enum(SECTIONS) })),
  });

  try {
    const response = await getAnthropic().messages.parse({
      model: AI_MODEL,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: names.map((n) => `- ${n}`).join("\n") }],
      output_config: { format: zodOutputFormat(Schema), effort: "low" }, // tarea sencilla
    });
    for (const item of response.parsed_output?.items ?? []) result.set(item.name, item.section);
  } catch (error) {
    console.error("classifyIngredients", error);
  }
  return result;
}

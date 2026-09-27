// Piezas comunes para llamar a Claude (importar recetas, sugerir menús…). SOLO SERVIDOR:
// usa ANTHROPIC_API_KEY, que nunca debe llegar al navegador.
import Anthropic from "@anthropic-ai/sdk";

// Modelo indicado en el CLAUDE.md para las funciones de IA.
export const AI_MODEL = "claude-sonnet-5";

// Error con un mensaje apto para enseñar al usuario.
export class AiError extends Error {}

// Cliente de Anthropic (lee ANTHROPIC_API_KEY del entorno). Avisa claramente si falta la clave.
export function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AiError("Falta configurar la clave de Anthropic (ANTHROPIC_API_KEY).");
  }
  return new Anthropic();
}

// Traduce un error de la API de Anthropic a un mensaje comprensible.
export function toAiError(error: unknown): AiError {
  console.error("Claude API", error);
  if (error instanceof Anthropic.AuthenticationError) {
    return new AiError("La clave de Anthropic no es válida.");
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new AiError("Demasiadas peticiones seguidas. Espera un minuto.");
  }
  // El caso típico de 400 aquí es que la cuenta de Anthropic se ha quedado sin saldo.
  if (error instanceof Anthropic.BadRequestError) {
    return new AiError("Claude ha rechazado la petición. Revisa que quede saldo en la cuenta de Anthropic.");
  }
  return new AiError("No se ha podido contactar con Claude. Inténtalo de nuevo.");
}

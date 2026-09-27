// Utilidades para cantidades y unidades: leer lo que escribe el usuario ("1,5"),
// escalar por raciones y mostrar bonito ("1,5 kg" en vez de "1500 g").
import type { Unit } from "@/types/recipe";

// Convierte el texto de un campo de cantidad en número.
// Acepta coma o punto decimal y fracciones simples ("1/2"). Devuelve null si está vacío o no es válido.
export function parseQuantity(text: string): number | null {
  const t = text.trim().replace(",", ".");
  if (!t) return null;
  const fraction = t.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fraction) {
    const value = Number(fraction[1]) / Number(fraction[2]);
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  const value = Number(t);
  return Number.isFinite(value) && value > 0 ? value : null;
}

// Número en formato español, con como mucho 2 decimales y sin ceros sobrantes: 1.5 → "1,5".
// Sin separador de miles ("10000", no "10.000"): si no, al volver a leerlo el punto se tomaría como decimal.
export function formatNumber(value: number): string {
  return value.toLocaleString("es-ES", { maximumFractionDigits: 2, useGrouping: false });
}

// Pasa a la unidad más cómoda de leer: 1500 g → 1,5 kg; 0,25 l → 250 ml.
function normalizeUnit(quantity: number, unit: Unit): { quantity: number; unit: Unit } {
  if (unit === "g" && quantity >= 1000) return { quantity: quantity / 1000, unit: "kg" };
  if (unit === "kg" && quantity < 1) return { quantity: quantity * 1000, unit: "g" };
  if (unit === "ml" && quantity >= 1000) return { quantity: quantity / 1000, unit: "l" };
  if (unit === "l" && quantity < 1) return { quantity: quantity * 1000, unit: "ml" };
  return { quantity, unit };
}

// Texto final de la cantidad de un ingrediente, multiplicada por `factor` (escalado de raciones).
// Ejemplos: (200, "g") → "200 g"; (3, "ud") → "3"; (null, null) → "" (p. ej. "sal al gusto").
export function formatQuantity(quantity: number | null, unit: Unit | null, factor = 1): string {
  if (quantity == null) return "";
  const scaled = quantity * factor;
  if (!unit) return formatNumber(scaled);
  const n = normalizeUnit(scaled, unit);
  // "ud" (unidades) no se escribe: "3 huevos" se lee mejor que "3 ud huevos".
  if (n.unit === "ud") return formatNumber(n.quantity);
  return `${formatNumber(n.quantity)} ${n.unit}`;
}

// "15 min", "1 h 30 min"…
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

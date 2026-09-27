// Utilidades de fechas para el menú semanal.
// Trabajamos con fechas como texto "AAAA-MM-DD" (sin horas) para evitar líos de zonas horarias:
// internamente se calculan en UTC, que no tiene cambios de hora.

// Zona horaria de referencia para saber qué día es "hoy" (el servidor puede estar en otro país).
const TIME_ZONE = "Europe/Madrid";

// Iniciales de los días, empezando en lunes.
export const DAY_INITIALS = ["L", "M", "X", "J", "V", "S", "D"];
const DAY_NAMES = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

// "AAAA-MM-DD" → Date a medianoche UTC.
function toDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// Date → "AAAA-MM-DD".
function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ¿Es un texto de fecha válido "AAAA-MM-DD"?
export function isIsoDate(text: string | null | undefined): text is string {
  return Boolean(text && /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(toDate(text).getTime()));
}

// Fecha de hoy en España.
export function today(): string {
  // "en-CA" da el formato AAAA-MM-DD directamente.
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

// Suma (o resta) días a una fecha.
export function addDays(iso: string, days: number): string {
  const date = toDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIso(date);
}

// Posición del día en la semana: 0 = lunes … 6 = domingo.
export function weekdayIndex(iso: string): number {
  return (toDate(iso).getUTCDay() + 6) % 7;
}

// Lunes de la semana a la que pertenece la fecha.
export function mondayOf(iso: string): string {
  return addDays(iso, -weekdayIndex(iso));
}

// Las 7 fechas de la semana que empieza en `monday`.
export function weekDates(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

// Número del día del mes: "2026-09-28" → 28.
export function dayOfMonth(iso: string): number {
  return toDate(iso).getUTCDate();
}

// "Semana del 28 sep".
export function weekLabel(monday: string): string {
  const month = new Intl.DateTimeFormat("es-ES", { month: "short", timeZone: "UTC" })
    .format(toDate(monday))
    .replace(".", "");
  return `Semana del ${dayOfMonth(monday)} ${month}`;
}

// "lunes 28" — para mensajes como "Añadido al lunes 28, comida".
export function dayLabel(iso: string): string {
  return `${DAY_NAMES[weekdayIndex(iso)]} ${dayOfMonth(iso)}`;
}

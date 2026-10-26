/** Money helpers. Prices are stored in kobo (1 naira = 100 kobo). */

export function formatNaira(kobo: number): string {
  const safe = Number.isFinite(kobo) ? Math.max(0, Math.round(kobo)) : 0;
  const hasKobo = safe % 100 !== 0;
  const naira = safe / 100;
  return `₦${naira.toLocaleString("en-NG", {
    minimumFractionDigits: hasKobo ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

/** Parses a user-typed naira amount ("12,500" or "12500.50") into kobo. */
export function parseNairaToKobo(input: unknown): number | null {
  if (typeof input === "number") {
    return Number.isFinite(input) && input >= 0 ? nairaToKobo(input) : null;
  }
  if (typeof input !== "string") return null;
  const cleaned = input.replace(/[₦,\s]/g, "");
  if (cleaned === "" || !/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return nairaToKobo(Number(cleaned));
}

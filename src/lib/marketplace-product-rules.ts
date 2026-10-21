const EXPIRY_TRACKED_CATEGORY = /\b(food|foods|grocery|groceries|dairy|beverage|beverages|bakery|medicine|medicines|pharma|pharmaceuticals|cosmetic|cosmetics|personal care|supplement|supplements|perishable)\b/i;

export function categoryNeedsExpiryDate(category: string) {
  return EXPIRY_TRACKED_CATEGORY.test(category.trim());
}

export function parseProductExpiryDate(value: unknown): string | null | undefined {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? undefined : value;
}

export function isProductExpiryDatePast(value: string) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  return value < today;
}

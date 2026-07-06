/**
 * Ingredient vision: read an ingredient list from a photo or a screenshot
 * (e.g. a recipe card, a FitMenCook post, a cookbook page) and return the raw
 * ingredient lines. Those lines are then parsed by the existing pure
 * `ingredientsFromText` logic, so the AI only has to do OCR + light structuring.
 */

export interface IngredientVisionRequest {
  imageBase64: string;
  mimeType: string;
  hint?: string;
}

export interface IngredientResult {
  title?: string;
  /** Raw ingredient lines, e.g. "2 cups cooked brown rice". */
  ingredients: string[];
  provider: string;
  notes?: string;
}

export const INGREDIENTS_JSON_INSTRUCTIONS = `You read recipe ingredient lists from images (a photo or a screenshot of a recipe). Respond with STRICT JSON only (no markdown, no prose) matching this TypeScript type:

{
  "title": string,               // recipe title if visible, else ""
  "ingredients": string[],       // one raw line per ingredient, e.g. "2 cups cooked brown rice", "6 oz grilled chicken", "1/2 avocado"
  "notes": string                // brief caveats, e.g. text partially cut off
}

Keep each ingredient's quantity and unit in its line. Do NOT include step instructions, only ingredients. Return ONLY the JSON object.`;

export function buildIngredientUserText(hint?: string): string {
  const base = 'Extract the ingredient list from this image. One ingredient per line, keeping quantities.';
  return hint ? `${base} Context: ${hint}` : base;
}

/** Normalise untrusted model JSON into a well-formed IngredientResult. */
export function coerceIngredients(raw: unknown, provider: string): IngredientResult {
  const obj = (raw ?? {}) as any;
  const ingredients: string[] = Array.isArray(obj.ingredients)
    ? obj.ingredients
        .map((x: unknown) => (typeof x === 'string' ? x.trim() : ''))
        .filter((s: string) => s.length > 0)
    : [];
  const title =
    typeof obj.title === 'string' && obj.title.trim() ? obj.title.trim() : undefined;
  return {
    title,
    ingredients,
    provider,
    notes: typeof obj.notes === 'string' ? obj.notes : undefined,
  };
}

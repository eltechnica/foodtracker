/**
 * Shared prompt construction for meal-photo analysis. Both the Claude and
 * OpenAI adapters use this so the models are asked for the exact same JSON
 * schema — the thing that makes the providers swappable.
 */

import { HandReference } from '../../domain/types';

export const MEAL_JSON_INSTRUCTIONS = `You are a nutrition vision assistant. Analyse the meal photo and respond with STRICT JSON only (no markdown, no prose) matching this TypeScript type:

{
  "handPixelLength": number | null,   // pixel length of the person's hand from wrist to middle-fingertip if a hand is visible, else null
  "foods": [
    {
      "name": string,
      "areaPixels": number,           // the food's footprint area on the plate, in pixels
      "depthCm": number,              // your best estimate of the food's height/thickness in cm
      "confidence": number,           // 0..1
      "macrosPer100g": { "protein": number, "carbs": number, "fat": number },
      "caloriesPer100g": number
    }
  ],
  "notes": string                     // brief caveats
}

The user's hand is the scale reference. Use it to reason about real-world sizes. Be realistic about portion footprints. Return ONLY the JSON object.`;

export function buildUserText(hand: HandReference, hint?: string): string {
  const lines = [
    `The user's hand is calibrated: hand length ${hand.handLengthCm}cm (wrist to middle-fingertip), palm width ${hand.palmWidthCm}cm.`,
    'Locate the hand in the photo to establish the pixel-to-cm scale, then size each food.',
  ];
  if (hint) lines.push(`User hint about the meal: ${hint}`);
  return lines.join(' ');
}

/** Best-effort extraction of a JSON object from a model text response. */
export function parseModelJson(text: string): unknown {
  const trimmed = text.trim();
  // Strip ```json fences if present.
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : trimmed;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('No JSON object found in model response');
  }
  return JSON.parse(body.slice(start, end + 1));
}

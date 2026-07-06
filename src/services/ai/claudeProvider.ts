/**
 * Anthropic Claude vision adapter. Uses the Messages API with an image block.
 * The API key is supplied at construction so key management stays out of the
 * domain/UI. Nothing here is Claude-specific beyond the request shape — the
 * prompts and JSON schemas are shared with the OpenAI adapter.
 */

import { buildUserText, MEAL_JSON_INSTRUCTIONS, parseModelJson } from './prompt';
import { coerceVisionResult } from './coerce';
import {
  buildReceiptUserText,
  coerceReceipt,
  RECEIPT_JSON_INSTRUCTIONS,
  ReceiptResult,
  ReceiptVisionRequest,
} from './receipt';
import {
  buildIngredientUserText,
  coerceIngredients,
  INGREDIENTS_JSON_INSTRUCTIONS,
  IngredientResult,
  IngredientVisionRequest,
} from './ingredients';
import {
  buildNutritionUserText,
  coerceNutrition,
  NUTRITION_JSON_INSTRUCTIONS,
  NutritionResult,
  NutritionVisionRequest,
} from './mealScreenshot';
import {
  coerceWeight,
  WEIGHT_JSON_INSTRUCTIONS,
  WeightScanResult,
  WeightVisionRequest,
} from './weightScan';
import { MealVisionRequest, MealVisionResult, VisionProvider } from './types';

export interface ClaudeConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export class ClaudeVisionProvider implements VisionProvider {
  readonly name = 'claude';
  private readonly cfg: Required<ClaudeConfig>;

  constructor(cfg: ClaudeConfig) {
    this.cfg = {
      model: 'claude-opus-4-8',
      baseUrl: 'https://api.anthropic.com',
      ...cfg,
    };
  }

  /** Shared image+prompt call; returns the model's raw text response. */
  private async call(
    system: string,
    userText: string,
    imageBase64: string,
    mimeType: string,
  ): Promise<string> {
    const res = await fetch(`${this.cfg.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.cfg.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.cfg.model,
        max_tokens: 1024,
        system,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
              { type: 'text', text: userText },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`Claude API error ${res.status}: ${await res.text()}`);
    }
    const json: any = await res.json();
    return json?.content?.[0]?.text ?? '';
  }

  async analyzeMeal(req: MealVisionRequest): Promise<MealVisionResult> {
    const text = await this.call(
      MEAL_JSON_INSTRUCTIONS,
      buildUserText(req.hand, req.hint),
      req.imageBase64,
      req.mimeType,
    );
    return coerceVisionResult(parseModelJson(text), this.name);
  }

  async analyzeReceipt(req: ReceiptVisionRequest): Promise<ReceiptResult> {
    const text = await this.call(
      RECEIPT_JSON_INSTRUCTIONS,
      buildReceiptUserText(req.hint),
      req.imageBase64,
      req.mimeType,
    );
    return coerceReceipt(parseModelJson(text), this.name);
  }

  async analyzeIngredients(req: IngredientVisionRequest): Promise<IngredientResult> {
    const text = await this.call(
      INGREDIENTS_JSON_INSTRUCTIONS,
      buildIngredientUserText(req.hint),
      req.imageBase64,
      req.mimeType,
    );
    return coerceIngredients(parseModelJson(text), this.name);
  }

  async analyzeNutrition(req: NutritionVisionRequest): Promise<NutritionResult> {
    const text = await this.call(
      NUTRITION_JSON_INSTRUCTIONS,
      buildNutritionUserText(req.hint),
      req.imageBase64,
      req.mimeType,
    );
    return coerceNutrition(parseModelJson(text), this.name);
  }

  async analyzeWeight(req: WeightVisionRequest): Promise<WeightScanResult> {
    const text = await this.call(
      WEIGHT_JSON_INSTRUCTIONS,
      'Read the body weight from this image.',
      req.imageBase64,
      req.mimeType,
    );
    return coerceWeight(parseModelJson(text), this.name);
  }
}

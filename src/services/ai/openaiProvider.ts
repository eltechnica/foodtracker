/**
 * OpenAI vision adapter (GPT-4o family). Shares the same prompts and JSON
 * schemas as the Claude adapter so the two are drop-in interchangeable.
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
import { MealVisionRequest, MealVisionResult, VisionProvider } from './types';

export interface OpenAIConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export class OpenAIVisionProvider implements VisionProvider {
  readonly name = 'openai';
  private readonly cfg: Required<OpenAIConfig>;

  constructor(cfg: OpenAIConfig) {
    this.cfg = {
      model: 'gpt-4o',
      baseUrl: 'https://api.openai.com',
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
    const res = await fetch(`${this.cfg.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: this.cfg.model,
        max_tokens: 1024,
        messages: [
          { role: 'system', content: system },
          {
            role: 'user',
            content: [
              { type: 'text', text: userText },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`);
    }
    const json: any = await res.json();
    return json?.choices?.[0]?.message?.content ?? '';
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
}

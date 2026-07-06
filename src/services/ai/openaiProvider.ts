/**
 * OpenAI vision adapter (GPT-4o family). Shares the same prompt and JSON schema
 * as the Claude adapter so the two are drop-in interchangeable.
 */

import { buildUserText, MEAL_JSON_INSTRUCTIONS, parseModelJson } from './prompt';
import { coerceVisionResult } from './coerce';
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

  async analyzeMeal(req: MealVisionRequest): Promise<MealVisionResult> {
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
          { role: 'system', content: MEAL_JSON_INSTRUCTIONS },
          {
            role: 'user',
            content: [
              { type: 'text', text: buildUserText(req.hand, req.hint) },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${req.mimeType};base64,${req.imageBase64}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`);
    }
    const json: any = await res.json();
    const text: string = json?.choices?.[0]?.message?.content ?? '';
    return coerceVisionResult(parseModelJson(text), this.name);
  }
}

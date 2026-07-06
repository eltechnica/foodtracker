/**
 * Anthropic Claude vision adapter. Uses the Messages API with an image block.
 * The API key is supplied at construction so key management stays out of the
 * domain/UI. Nothing here is Claude-specific beyond the request shape — the
 * prompt and JSON schema are shared with the OpenAI adapter.
 */

import { buildUserText, MEAL_JSON_INSTRUCTIONS, parseModelJson } from './prompt';
import { coerceVisionResult } from './coerce';
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

  async analyzeMeal(req: MealVisionRequest): Promise<MealVisionResult> {
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
        system: MEAL_JSON_INSTRUCTIONS,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: req.mimeType,
                  data: req.imageBase64,
                },
              },
              { type: 'text', text: buildUserText(req.hand, req.hint) },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(`Claude API error ${res.status}: ${await res.text()}`);
    }
    const json: any = await res.json();
    const text: string = json?.content?.[0]?.text ?? '';
    return coerceVisionResult(parseModelJson(text), this.name);
  }
}

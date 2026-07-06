/**
 * Vision provider factory. The app picks a provider at runtime based on which
 * API key (if any) the user has configured, defaulting to the mock provider so
 * everything works out of the box.
 */

import { ClaudeVisionProvider } from './claudeProvider';
import { MockVisionProvider } from './mockProvider';
import { OpenAIVisionProvider } from './openaiProvider';
import { VisionProvider } from './types';

export type ProviderKind = 'mock' | 'claude' | 'openai';

export interface AiSettings {
  provider: ProviderKind;
  apiKey?: string;
  model?: string;
}

export function createVisionProvider(settings: AiSettings): VisionProvider {
  switch (settings.provider) {
    case 'claude':
      if (!settings.apiKey) throw new Error('Claude provider requires an API key');
      return new ClaudeVisionProvider({ apiKey: settings.apiKey, model: settings.model });
    case 'openai':
      if (!settings.apiKey) throw new Error('OpenAI provider requires an API key');
      return new OpenAIVisionProvider({ apiKey: settings.apiKey, model: settings.model });
    case 'mock':
    default:
      return new MockVisionProvider();
  }
}

export * from './types';
export { estimateMealFromVision } from './estimate';
export type { MealEstimate } from './estimate';

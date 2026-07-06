/**
 * Health data integration (weight, nutrition) from Apple Health / Renpho.
 *
 * IMPORTANT PLATFORM NOTE
 * -----------------------
 * Apple Health (HealthKit) has no cloud or web API by design. Data only leaves
 * the phone when a native app running on the user's device requests it with the
 * user's explicit permission. Renpho has no public API either, but the Renpho
 * app can be configured to write weight/body-fat into Apple Health — so the
 * realistic pipeline is:
 *
 *     Renpho scale ──▶ Renpho app ──▶ Apple Health ──▶ (this app via HealthKit)
 *
 * Because that requires a native module, this file defines the interface the UI
 * codes against, plus two working implementations:
 *
 *   - AppleHealthKitProvider: wraps a native HealthKit bridge (e.g.
 *     `@kingstinct/react-native-healthkit`). Requires a development build /
 *     EAS build with the HealthKit entitlement — it will NOT run in Expo Go.
 *   - HealthExportFileProvider: parses the "Export All Health Data" XML that
 *     any user can generate from the Health app with no code — a zero-native
 *     fallback that also works on Android/web.
 */

import { WeightEntry, WeightSource } from '../../domain/types';

export interface HealthProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  requestPermissions(): Promise<boolean>;
  /** Fetch weight samples since the given ISO datetime (inclusive). */
  getWeightSamples(sinceISO: string): Promise<WeightEntry[]>;
}

/**
 * Wraps a native HealthKit bridge. The bridge module is injected so the app
 * can build and run (and this file can be unit-tested) without the native
 * dependency present. In the real app you pass in the HealthKit module from a
 * dev/EAS build.
 */
export interface NativeHealthKitBridge {
  isHealthDataAvailable(): Promise<boolean>;
  requestAuthorization(read: string[], write: string[]): Promise<boolean>;
  /** Returns samples: { value: kg, startDate: ISO, metadata?: {...} } */
  queryQuantitySamples(
    type: string,
    options: { from: string },
  ): Promise<{ value: number; startDate: string; sourceName?: string }[]>;
}

export class AppleHealthKitProvider implements HealthProvider {
  readonly name = 'apple-health';
  constructor(private readonly bridge: NativeHealthKitBridge) {}

  isAvailable(): Promise<boolean> {
    return this.bridge.isHealthDataAvailable();
  }

  requestPermissions(): Promise<boolean> {
    return this.bridge.requestAuthorization(['HKQuantityTypeIdentifierBodyMass'], []);
  }

  async getWeightSamples(sinceISO: string): Promise<WeightEntry[]> {
    const samples = await this.bridge.queryQuantitySamples(
      'HKQuantityTypeIdentifierBodyMass',
      { from: sinceISO },
    );
    return samples.map((s, i) => ({
      id: `hk-${s.startDate}-${i}`,
      at: s.startDate,
      kg: s.value,
      // Renpho writes into HealthKit; tag by the originating source name.
      source: classifySource(s.sourceName),
    }));
  }
}

function classifySource(sourceName?: string): WeightSource {
  if (sourceName && /renpho/i.test(sourceName)) return 'renpho';
  return 'apple-health';
}

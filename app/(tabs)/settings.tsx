import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';

import { useAppStore } from '../../src/store/useAppStore';
import { Button, Card, Chip, Field, SectionTitle, StatTile } from '../../src/ui/components';
import { colors, spacing, DOCK_CLEARANCE } from '../../src/ui/theme';
import { handPortionGuide, REFERENCE_ADULT_HAND } from '../../src/domain/handScale';
import { ProviderKind } from '../../src/services/ai';

const PROVIDERS: ProviderKind[] = ['mock', 'claude', 'openai'];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { hand, setHand, ai, setAiSettings, resetAll } = useAppStore();

  // Pre-fill with the user's value or a sensible adult default, so the Save
  // button is never stuck disabled behind an empty-looking (placeholder) field.
  const [handLen, setHandLen] = useState(
    String(hand?.handLengthCm ?? REFERENCE_ADULT_HAND.handLengthCm),
  );
  const [palm, setPalm] = useState(String(hand?.palmWidthCm ?? REFERENCE_ADULT_HAND.palmWidthCm));
  const [apiKey, setApiKey] = useState(ai.apiKey ?? '');
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function saveHand() {
    const hl = Number(handLen);
    const pw = Number(palm);
    if (!Number.isFinite(hl) || hl <= 0) return;
    setHand({
      handLengthCm: hl,
      palmWidthCm: Number.isFinite(pw) && pw > 0 ? pw : hl * 0.46,
      calibratedAt: new Date().toISOString(),
    });
    setSavedAt(Date.now());
  }

  const guide = hand ? handPortionGuide(hand) : null;

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{
        padding: spacing.lg,
        paddingTop: insets.top + spacing.md,
        paddingBottom: DOCK_CLEARANCE,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 28, fontWeight: '800', marginBottom: spacing.md }}>
        Settings
      </Text>

      <SectionTitle>Hand calibration (scale reference)</SectionTitle>
      <Card>
        <Text style={{ color: colors.subtext, fontSize: 13, marginBottom: spacing.md }}>
          Measure your hand once — it becomes the stable scale reference for photo-based calorie
          estimates. Hand length is wrist crease to the tip of your middle finger.
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Field label="Hand length (cm)" keyboardType="decimal-pad" value={handLen} onChangeText={setHandLen} placeholder="18.5" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Palm width (cm)" keyboardType="decimal-pad" value={palm} onChangeText={setPalm} placeholder="8.5" />
          </View>
        </View>
        <Button
          title={savedAt ? 'Saved ✓' : hand ? 'Update calibration' : 'Save calibration'}
          onPress={saveHand}
          disabled={!Number(handLen)}
        />
        {(hand || savedAt) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm }}>
            <Check color={colors.accent} size={13} strokeWidth={2.6} />
            <Text style={{ color: colors.accent, fontSize: 12 }}>
              Calibrated{hand ? ` ${hand.calibratedAt.slice(0, 10)}` : ''} · hand {handLen}cm
            </Text>
          </View>
        )}
      </Card>

      {guide && (
        <>
          <SectionTitle>Your hand portions</SectionTitle>
          <Card>
            <View style={{ flexDirection: 'row', marginHorizontal: -spacing.xs, marginBottom: spacing.sm }}>
              <StatTile label="Palm protein" value={guide.proteinPalmGrams} unit="g" tint={colors.protein} />
              <StatTile label="Fist carbs" value={guide.carbFistGrams} unit="g" tint={colors.carbs} />
            </View>
            <View style={{ flexDirection: 'row', marginHorizontal: -spacing.xs }}>
              <StatTile label="Cupped hand" value={guide.cuppedHandGrams} unit="g" tint={colors.text} />
              <StatTile label="Thumb fat" value={guide.thumbFatGrams} unit="g" tint={colors.fat} />
            </View>
          </Card>
        </>
      )}

      <SectionTitle>AI vision provider</SectionTitle>
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
          {PROVIDERS.map((p) => (
            <Chip
              key={p}
              label={p}
              active={ai.provider === p}
              onPress={() => setAiSettings({ ...ai, provider: p })}
            />
          ))}
        </View>
        {ai.provider !== 'mock' && (
          <>
            <Field
              label={`${ai.provider} API key`}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="sk-…"
              autoCapitalize="none"
              secureTextEntry
            />
            <Button
              title="Save key"
              tone="neutral"
              onPress={() => setAiSettings({ ...ai, apiKey: apiKey.trim() || undefined })}
            />
          </>
        )}
        <Text style={{ color: colors.subtext, fontSize: 12, marginTop: spacing.sm }}>
          {ai.provider === 'mock'
            ? 'Mock provider returns a demo estimate with no API key required.'
            : 'Keys are stored locally on-device only.'}
        </Text>
      </Card>

      <SectionTitle>Data</SectionTitle>
      <Card>
        <Button title="Reset all data" tone="danger" onPress={resetAll} />
      </Card>

      <Text style={{ color: colors.subtext, fontSize: 12, textAlign: 'center', marginTop: spacing.md }}>
        Ultimate Health Tracker · MVP
      </Text>
    </ScrollView>
  );
}

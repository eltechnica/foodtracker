import { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, Image as ImageIcon, Sparkles, Plus, Check, TriangleAlert } from 'lucide-react-native';

import { useAppStore } from '../../src/store/useAppStore';
import { Button, Card, Field, SectionTitle } from '../../src/ui/components';
import { colors, spacing } from '../../src/ui/theme';
import { createVisionProvider, estimateMealFromVision, MealEstimate } from '../../src/services/ai';
import { REFERENCE_ADULT_HAND } from '../../src/domain/handScale';
import { HandReference, MealType } from '../../src/domain/types';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function MealsScreen() {
  const insets = useSafeAreaInsets();
  const { hand, ai, meals, addMeal, removeMeal } = useAppStore();
  const [photo, setPhoto] = useState<{ uri: string; base64: string } | null>(null);
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);
  const [estimate, setEstimate] = useState<MealEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mealType, setMealType] = useState<MealType>('lunch');

  const effectiveHand: HandReference =
    hand ?? { ...REFERENCE_ADULT_HAND, calibratedAt: new Date().toISOString() };

  async function pick(from: 'camera' | 'library') {
    setError(null);
    const opts: ImagePicker.ImagePickerOptions = {
      base64: true,
      quality: 0.6,
      mediaTypes: ['images'],
    };
    const res =
      from === 'camera'
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets?.[0]?.base64) return;
    setEstimate(null);
    setPhoto({ uri: res.assets[0].uri, base64: res.assets[0].base64! });
  }

  async function analyze() {
    if (!photo) return;
    setBusy(true);
    setError(null);
    try {
      const provider = createVisionProvider(ai);
      const result = await provider.analyzeMeal({
        imageBase64: photo.base64,
        mimeType: 'image/jpeg',
        hand: effectiveHand,
        hint: hint.trim() || undefined,
      });
      setEstimate(estimateMealFromVision(result, effectiveHand));
    } catch (e: any) {
      setError(e?.message ?? 'Analysis failed');
    } finally {
      setBusy(false);
    }
  }

  function save() {
    if (!estimate) return;
    addMeal({
      at: new Date().toISOString(),
      type: mealType,
      source: 'ai-photo',
      items: estimate.items,
      photoUri: photo?.uri,
      notes: hint.trim() || undefined,
    });
    setPhoto(null);
    setEstimate(null);
    setHint('');
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.md }}
    >
      <Text style={{ color: colors.text, fontSize: 28, fontWeight: '800', marginBottom: spacing.md }}>
        Log a meal
      </Text>

      <Card>
        <SectionTitle>1 · Photo</SectionTitle>
        {photo ? (
          <Image
            source={{ uri: photo.uri }}
            style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: spacing.md }}
          />
        ) : (
          <Text style={{ color: colors.subtext, marginBottom: spacing.md }}>
            Include your hand in the frame — it's the scale reference.
          </Text>
        )}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button title="Camera" icon={Camera} onPress={() => pick('camera')} tone="neutral" />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Library" icon={ImageIcon} onPress={() => pick('library')} tone="neutral" />
          </View>
        </View>
      </Card>

      {photo && (
        <Card>
          <SectionTitle>2 · Describe (optional)</SectionTitle>
          <Field
            label="What is it?"
            placeholder="e.g. chicken burrito bowl"
            value={hint}
            onChangeText={setHint}
          />
          <Button
            title={busy ? 'Analyzing…' : 'Estimate calories'}
            icon={busy ? undefined : Sparkles}
            onPress={analyze}
            disabled={busy}
          />
          {busy && <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.md }} />}
          {!hand && (
            <Text style={{ color: colors.fat, fontSize: 12, marginTop: spacing.sm }}>
              Using a default hand size — calibrate yours in Settings for accuracy.
            </Text>
          )}
          <Text style={{ color: colors.subtext, fontSize: 12, marginTop: spacing.sm }}>
            Provider: {ai.provider}
          </Text>
        </Card>
      )}

      {error && (
        <Card style={{ borderColor: colors.danger }}>
          <Text style={{ color: colors.danger }}>{error}</Text>
        </Card>
      )}

      {estimate && (
        <Card>
          <SectionTitle>3 · Review estimate</SectionTitle>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>
            {estimate.totalCalories} kcal
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm }}>
            {estimate.handDetected ? (
              <Check color={colors.accent} size={15} strokeWidth={2.4} />
            ) : (
              <TriangleAlert color={colors.fat} size={15} strokeWidth={2.4} />
            )}
            <Text style={{ color: colors.subtext, flex: 1 }}>
              {estimate.handDetected ? 'Hand detected as scale' : 'No hand detected — rough estimate'}
              {'  ·  '}P {estimate.totalMacros.protein}g · C {estimate.totalMacros.carbs}g · F{' '}
              {estimate.totalMacros.fat}g
            </Text>
          </View>
          {estimate.items.map((it, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 6,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: colors.border,
              }}
            >
              <Text style={{ color: colors.text }}>
                {it.name} · {it.grams}g
              </Text>
              <Text style={{ color: colors.subtext }}>{it.calories} kcal</Text>
            </View>
          ))}
          {estimate.notes && (
            <Text style={{ color: colors.subtext, fontSize: 12, marginTop: spacing.sm }}>
              {estimate.notes}
            </Text>
          )}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.md }}>
            {MEAL_TYPES.map((t) => (
              <Text
                key={t}
                onPress={() => setMealType(t)}
                style={{
                  color: mealType === t ? '#06210f' : colors.text,
                  backgroundColor: mealType === t ? colors.accent : colors.cardAlt,
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  overflow: 'hidden',
                  fontWeight: '600',
                }}
              >
                {t}
              </Text>
            ))}
          </View>
          <Button title="Save meal" icon={Plus} onPress={save} />
        </Card>
      )}

      <SectionTitle>Recent meals</SectionTitle>
      {meals.length === 0 && <Text style={{ color: colors.subtext }}>No meals logged yet.</Text>}
      {meals.slice(0, 12).map((m) => {
        const kcal = m.items.reduce((a, i) => a + i.calories, 0);
        return (
          <Card key={m.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>
                {m.type} · {kcal} kcal
              </Text>
              <Text onPress={() => removeMeal(m.id)} style={{ color: colors.danger }}>
                Delete
              </Text>
            </View>
            <Text style={{ color: colors.subtext, fontSize: 12, marginTop: 2 }}>
              {m.at.slice(0, 16).replace('T', ' ')} · {m.source} · {m.items.map((i) => i.name).join(', ')}
            </Text>
          </Card>
        );
      })}
    </ScrollView>
  );
}

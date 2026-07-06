import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, Image as ImageIcon, Sparkles, Plus, Check, TriangleAlert, PencilLine, ScanLine } from 'lucide-react-native';

import { useAppStore } from '../../src/store/useAppStore';
import { Button, Card, Chip, Field, SectionTitle } from '../../src/ui/components';
import { colors, spacing, DOCK_CLEARANCE } from '../../src/ui/theme';
import { createVisionProvider, estimateMealFromVision, MealEstimate } from '../../src/services/ai';
import { REFERENCE_ADULT_HAND } from '../../src/domain/handScale';
import { caloriesFromMacros } from '../../src/domain/nutrition';
import { FoodItem, HandReference, MealType } from '../../src/domain/types';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
type Mode = 'camera' | 'manual' | 'screenshot';
const MODES: { key: Mode; label: string }[] = [
  { key: 'camera', label: 'Camera' },
  { key: 'manual', label: 'Manual' },
  { key: 'screenshot', label: 'Screenshot' },
];

export default function MealsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string }>();
  const { hand, ai, meals, addMeal, removeMeal } = useAppStore();

  const initialMode: Mode =
    params.mode === 'manual' || params.mode === 'screenshot' ? params.mode : 'camera';
  const [mode, setMode] = useState<Mode>(initialMode);
  // Re-opening this screen from the floating button with a new ?mode= updates
  // the view even though the tab screen stays mounted.
  useEffect(() => {
    if (params.mode === 'manual' || params.mode === 'screenshot' || params.mode === 'camera') {
      setMode(params.mode);
    }
  }, [params.mode]);
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Camera flow
  const [photo, setPhoto] = useState<{ uri: string; base64: string } | null>(null);
  const [hint, setHint] = useState('');
  const [estimate, setEstimate] = useState<MealEstimate | null>(null);

  // Manual flow
  const [mName, setMName] = useState('');
  const [mCal, setMCal] = useState('');
  const [mP, setMP] = useState('');
  const [mC, setMC] = useState('');
  const [mF, setMF] = useState('');

  // Screenshot flow
  const [shot, setShot] = useState<{ uri: string; base64: string } | null>(null);
  const [shotItems, setShotItems] = useState<FoodItem[] | null>(null);

  const effectiveHand: HandReference =
    hand ?? { ...REFERENCE_ADULT_HAND, calibratedAt: new Date().toISOString() };

  async function pickImage(from: 'camera' | 'library') {
    const res =
      from === 'camera'
        ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6, mediaTypes: ['images'] })
        : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.6, mediaTypes: ['images'] });
    if (res.canceled || !res.assets?.[0]?.base64) return null;
    return { uri: res.assets[0].uri, base64: res.assets[0].base64! };
  }

  async function pickPhoto(from: 'camera' | 'library') {
    setError(null);
    const p = await pickImage(from);
    if (!p) return;
    setEstimate(null);
    setPhoto(p);
  }

  async function analyzePhoto() {
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

  async function scanScreenshot(from: 'camera' | 'library') {
    setError(null);
    const p = await pickImage(from);
    if (!p) return;
    setShot(p);
    setShotItems(null);
    setBusy(true);
    try {
      const provider = createVisionProvider(ai);
      const result = await provider.analyzeNutrition({ imageBase64: p.base64, mimeType: 'image/jpeg' });
      setShotItems(result.items);
      if (!result.items.length) setError('No nutrition info found in that screenshot.');
    } catch (e: any) {
      setError(e?.message ?? 'Could not read the screenshot');
    } finally {
      setBusy(false);
    }
  }

  function savePhotoMeal() {
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

  function saveManualMeal() {
    const cal = Number(mCal);
    const macros = { protein: Number(mP) || 0, carbs: Number(mC) || 0, fat: Number(mF) || 0 };
    const calories = Number.isFinite(cal) && cal > 0 ? cal : Math.round(caloriesFromMacros(macros));
    if (calories <= 0) return;
    addMeal({
      at: new Date().toISOString(),
      type: mealType,
      source: 'manual',
      items: [{ name: mName.trim() || 'Meal', grams: 0, calories, macros }],
    });
    setMName('');
    setMCal('');
    setMP('');
    setMC('');
    setMF('');
  }

  function saveScreenshotMeal() {
    if (!shotItems?.length) return;
    addMeal({
      at: new Date().toISOString(),
      type: mealType,
      source: 'health-import',
      items: shotItems,
      photoUri: shot?.uri,
    });
    setShot(null);
    setShotItems(null);
  }

  const shotTotal = shotItems?.reduce((a, i) => a + i.calories, 0) ?? 0;

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
        Log a meal
      </Text>

      {/* Mode selector */}
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        {MODES.map((m) => (
          <Chip key={m.key} label={m.label} active={mode === m.key} onPress={() => setMode(m.key)} />
        ))}
      </View>

      {/* Shared meal-type selector */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
        {MEAL_TYPES.map((t) => (
          <Chip key={t} label={t} active={mealType === t} onPress={() => setMealType(t)} />
        ))}
      </View>

      {error && (
        <Card style={{ borderColor: colors.danger }}>
          <Text style={{ color: colors.danger }}>{error}</Text>
        </Card>
      )}

      {/* CAMERA MODE */}
      {mode === 'camera' && (
        <>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
              <Camera color={colors.accent} size={18} strokeWidth={2.2} />
              <Text style={{ color: colors.subtext, fontSize: 13, flex: 1 }}>
                Include your hand in the frame — it's the scale reference for portion size.
              </Text>
            </View>
            {photo && (
              <Image
                source={{ uri: photo.uri }}
                style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: spacing.md }}
              />
            )}
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button title="Camera" icon={Camera} onPress={() => pickPhoto('camera')} tone="neutral" />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Library" icon={ImageIcon} onPress={() => pickPhoto('library')} tone="neutral" />
              </View>
            </View>
          </Card>

          {photo && (
            <Card>
              <Field label="What is it? (optional)" placeholder="e.g. chicken burrito bowl" value={hint} onChangeText={setHint} />
              <Button
                title={busy ? 'Analyzing…' : 'Estimate calories'}
                icon={busy ? undefined : Sparkles}
                onPress={analyzePhoto}
                disabled={busy}
              />
              {busy && <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.md }} />}
            </Card>
          )}

          {estimate && (
            <Card>
              <SectionTitle>Review estimate</SectionTitle>
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
                  {'  ·  '}P {estimate.totalMacros.protein}g · C {estimate.totalMacros.carbs}g · F {estimate.totalMacros.fat}g
                </Text>
              </View>
              {estimate.items.map((it, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}>
                  <Text style={{ color: colors.text, flex: 1 }}>{it.name} · {it.grams}g</Text>
                  <Text style={{ color: colors.subtext }}>{it.calories} kcal</Text>
                </View>
              ))}
              <View style={{ marginTop: spacing.md }}>
                <Button title="Save meal" icon={Plus} onPress={savePhotoMeal} />
              </View>
            </Card>
          )}
        </>
      )}

      {/* MANUAL MODE */}
      {mode === 'manual' && (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
            <PencilLine color={colors.accent} size={18} strokeWidth={2.2} />
            <Text style={{ color: colors.subtext, fontSize: 13, flex: 1 }}>
              Enter it yourself. Leave calories blank to compute them from the macros.
            </Text>
          </View>
          <Field label="Name" value={mName} onChangeText={setMName} placeholder="Greek yogurt & berries" />
          <Field label="Calories (optional)" keyboardType="decimal-pad" value={mCal} onChangeText={setMCal} placeholder="auto from macros" />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}><Field label="P (g)" keyboardType="decimal-pad" value={mP} onChangeText={setMP} /></View>
            <View style={{ flex: 1 }}><Field label="C (g)" keyboardType="decimal-pad" value={mC} onChangeText={setMC} /></View>
            <View style={{ flex: 1 }}><Field label="F (g)" keyboardType="decimal-pad" value={mF} onChangeText={setMF} /></View>
          </View>
          <Button title="Save meal" icon={Plus} onPress={saveManualMeal} disabled={!mCal && !mP && !mC && !mF} />
        </Card>
      )}

      {/* SCREENSHOT MODE */}
      {mode === 'screenshot' && (
        <>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
              <ScanLine color={colors.accent} size={18} strokeWidth={2.2} />
              <Text style={{ color: colors.subtext, fontSize: 13, flex: 1 }}>
                Upload a screenshot showing macros/calories or a food list (e.g. from another app or a
                nutrition label). AI logs it as a meal.
              </Text>
            </View>
            {shot && (
              <Image source={{ uri: shot.uri }} style={{ width: '100%', height: 180, borderRadius: 12, marginBottom: spacing.md }} resizeMode="cover" />
            )}
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button title="Photograph" icon={Camera} onPress={() => scanScreenshot('camera')} tone="neutral" disabled={busy} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Upload image" icon={ImageIcon} onPress={() => scanScreenshot('library')} tone="neutral" disabled={busy} />
              </View>
            </View>
            {busy && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md }}>
                <ActivityIndicator color={colors.accent} />
                <Text style={{ color: colors.subtext }}>Reading screenshot…</Text>
              </View>
            )}
          </Card>

          {shotItems && shotItems.length > 0 && (
            <Card>
              <SectionTitle>Review</SectionTitle>
              <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: spacing.sm }}>
                {shotTotal} kcal
              </Text>
              {shotItems.map((it, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}>
                  <Text style={{ color: colors.text, flex: 1 }}>{it.name}</Text>
                  <Text style={{ color: colors.subtext }}>{it.calories} kcal</Text>
                </View>
              ))}
              <View style={{ marginTop: spacing.md }}>
                <Button title="Save meal" icon={Plus} onPress={saveScreenshotMeal} />
              </View>
            </Card>
          )}
        </>
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
              {m.at.slice(0, 16).replace('T', ' ')} · {m.items.map((i) => i.name).join(', ')}
            </Text>
          </Card>
        );
      })}
    </ScrollView>
  );
}

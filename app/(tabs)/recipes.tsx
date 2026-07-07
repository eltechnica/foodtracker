import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Plus, Camera, Upload, ScanLine } from 'lucide-react-native';

import { useAppStore } from '../../src/store/useAppStore';
import { Button, Card, Field, SectionTitle } from '../../src/ui/components';
import { Screen } from '../../src/ui/Screen';
import { colors, spacing } from '../../src/ui/theme';
import { ensureCalories, ingredientsFromText, nutritionForServings } from '../../src/domain/fitmencook';
import { Recipe } from '../../src/domain/types';
import { createVisionProvider } from '../../src/services/ai';

export default function RecipesScreen() {
  const { recipes, ai, addRecipe, addMeal } = useAppStore();

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [servings, setServings] = useState('4');
  const [cal, setCal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [blob, setBlob] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  async function scanIngredients(from: 'camera' | 'library') {
    setScanError(null);
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

    setScanning(true);
    try {
      const provider = createVisionProvider(ai);
      const result = await provider.analyzeIngredients({
        imageBase64: res.assets[0].base64!,
        mimeType: 'image/jpeg',
      });
      if (result.title && !title.trim()) setTitle(result.title);
      if (result.ingredients.length) {
        // Append to whatever is already in the box so scans can stack.
        setBlob((prev) => (prev.trim() ? prev + '\n' : '') + result.ingredients.join('\n'));
      } else {
        setScanError('No ingredients found in that image.');
      }
    } catch (e: any) {
      setScanError(e?.message ?? 'Could not read the ingredients');
    } finally {
      setScanning(false);
    }
  }

  function save() {
    const ingredients = ingredientsFromText(blob);
    const macros = {
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
    };
    addRecipe({
      title: title.trim() || 'Untitled recipe',
      source: url.includes('youtu') ? 'youtube' : 'fitmencook',
      sourceUrl: url.trim() || undefined,
      servings: Math.max(1, Number(servings) || 1),
      ingredients,
      steps: [],
      perServing: { calories: ensureCalories(macros, Number(cal) || undefined), macros },
    });
    setTitle('');
    setUrl('');
    setCal('');
    setProtein('');
    setCarbs('');
    setFat('');
    setBlob('');
  }

  function logServing(recipe: Recipe) {
    const n = nutritionForServings(recipe, 1);
    addMeal({
      at: new Date().toISOString(),
      type: 'dinner',
      source: 'fitmencook',
      items: [
        {
          name: recipe.title,
          grams: 0,
          calories: n.calories,
          macros: n.macros,
        },
      ],
      notes: `1 serving of ${recipe.title}`,
    });
  }

  return (
    <Screen>
      <Text style={{ color: colors.subtext, marginBottom: spacing.lg, marginTop: spacing.xs }}>
        Add FitMenCook recipes by pasting the ingredient list, or a YouTube transcript to
        auto-extract ingredients.
      </Text>

      <Card>
        <SectionTitle>New recipe</SectionTitle>
        <Field label="Title" value={title} onChangeText={setTitle} placeholder="High-protein burrito bowl" />
        <Field label="Source URL (optional)" value={url} onChangeText={setUrl} placeholder="https://youtu.be/…" autoCapitalize="none" />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Field label="Servings" keyboardType="number-pad" value={servings} onChangeText={setServings} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Cal/serving" keyboardType="number-pad" value={cal} onChangeText={setCal} placeholder="auto" />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Field label="P (g)" keyboardType="decimal-pad" value={protein} onChangeText={setProtein} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="C (g)" keyboardType="decimal-pad" value={carbs} onChangeText={setCarbs} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="F (g)" keyboardType="decimal-pad" value={fat} onChangeText={setFat} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
          <ScanLine color={colors.accent} size={16} strokeWidth={2.2} />
          <Text style={{ color: colors.subtext, fontSize: 13, flex: 1 }}>
            Photograph or upload a screenshot of an ingredient list and AI fills it in below.
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Button title="Photograph" icon={Camera} tone="neutral" onPress={() => scanIngredients('camera')} disabled={scanning} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Upload image" icon={Upload} tone="neutral" onPress={() => scanIngredients('library')} disabled={scanning} />
          </View>
        </View>
        {scanning && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
            <ActivityIndicator color={colors.accent} />
            <Text style={{ color: colors.subtext }}>Reading ingredients…</Text>
          </View>
        )}
        {scanError && (
          <Text style={{ color: colors.danger, marginBottom: spacing.sm, fontSize: 13 }}>{scanError}</Text>
        )}
        <Field
          label="Ingredients (paste, or use scan above / YouTube transcript)"
          value={blob}
          onChangeText={setBlob}
          placeholder={'2 cups cooked brown rice\n6 oz grilled chicken\n1/2 avocado'}
          multiline
          numberOfLines={5}
          style={{ height: 110, textAlignVertical: 'top' }}
        />
        <Button title="Save recipe" icon={Plus} onPress={save} disabled={!title && !blob} />
      </Card>

      <SectionTitle>Your recipes</SectionTitle>
      {recipes.length === 0 && <Text style={{ color: colors.subtext }}>No recipes yet.</Text>}
      {recipes.map((r) => (
        <Card key={r.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>{r.title}</Text>
            <Text style={{ color: colors.accent, fontSize: 12 }}>{r.source}</Text>
          </View>
          <Text style={{ color: colors.subtext, fontSize: 12, marginTop: 2 }}>
            {r.perServing.calories} kcal/serving · P {r.perServing.macros.protein} · C{' '}
            {r.perServing.macros.carbs} · F {r.perServing.macros.fat} · {r.ingredients.length}{' '}
            ingredients
          </Text>
          <View style={{ marginTop: spacing.md }}>
            <Button title="Log 1 serving as a meal" icon={Plus} onPress={() => logServing(r)} tone="neutral" />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

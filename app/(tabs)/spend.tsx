import { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Plus, Wine, Camera, Upload, ScanLine, TriangleAlert } from 'lucide-react-native';

import { useAppStore } from '../../src/store/useAppStore';
import { Button, Card, Chip, Field, SectionTitle, StatTile } from '../../src/ui/components';
import { colors, spacing, DOCK_CLEARANCE } from '../../src/ui/theme';
import { ReceiptLineItem, SpendCategory } from '../../src/domain/types';
import { diningShare, estimateDrinkCalories, summariseAlcohol, summariseSpend } from '../../src/domain/spend';
import { createVisionProvider } from '../../src/services/ai';

const CATEGORIES: SpendCategory[] = ['grocery', 'dining', 'alcohol', 'other'];

interface ScannedReceipt {
  uri?: string;
  lineItems: ReceiptLineItem[];
  containsAlcohol: boolean;
  merchant?: string;
}

export default function SpendScreen() {
  const insets = useSafeAreaInsets();
  const { expenses, drinks, ai, addExpense, removeExpense, addDrink } = useAppStore();

  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState<SpendCategory>('grocery');

  // Receipt scanning
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanned, setScanned] = useState<ScannedReceipt | null>(null);

  // Drink logging
  const [drinkName, setDrinkName] = useState('');
  const [volume, setVolume] = useState('');
  const [abv, setAbv] = useState('');

  const spend = summariseSpend(expenses);
  const alcohol = summariseAlcohol(drinks);
  const share = Math.round(diningShare(spend) * 100);

  async function scanReceipt(from: 'camera' | 'library') {
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
      const receipt = await provider.analyzeReceipt({
        imageBase64: res.assets[0].base64!,
        mimeType: 'image/jpeg',
      });
      // Prefill the form from the extracted data.
      if (receipt.total != null) setAmount(String(receipt.total));
      if (receipt.merchant) setMerchant(receipt.merchant);
      setCategory(receipt.category);
      setScanned({
        uri: res.assets[0].uri,
        lineItems: receipt.lineItems,
        containsAlcohol: receipt.containsAlcohol,
        merchant: receipt.merchant,
      });
    } catch (e: any) {
      setScanError(e?.message ?? 'Could not read the receipt');
    } finally {
      setScanning(false);
    }
  }

  function addSpend() {
    const v = Number(amount);
    if (!Number.isFinite(v) || v <= 0) return;
    addExpense({
      at: new Date().toISOString(),
      amount: v,
      currency: 'USD',
      category,
      merchant: merchant.trim() || undefined,
      source: scanned ? 'receipt-scan' : 'manual',
      receiptUri: scanned?.uri,
      lineItems: scanned?.lineItems?.length ? scanned.lineItems : undefined,
    });
    setAmount('');
    setMerchant('');
    setScanned(null);
  }

  function logDrink() {
    const vol = Number(volume);
    const a = Number(abv);
    if (!Number.isFinite(vol) || !Number.isFinite(a) || vol <= 0) return;
    const { calories, standardDrinks } = estimateDrinkCalories(vol, a);
    addDrink({
      at: new Date().toISOString(),
      name: drinkName.trim() || 'drink',
      standardDrinks,
      calories,
    });
    setDrinkName('');
    setVolume('');
    setAbv('');
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.md, paddingBottom: DOCK_CLEARANCE }}
    >
      <Text style={{ color: colors.text, fontSize: 28, fontWeight: '800', marginBottom: spacing.md }}>
        Spend & alcohol
      </Text>

      <Card>
        <View style={{ flexDirection: 'row', marginHorizontal: -spacing.xs, marginBottom: spacing.sm }}>
          <StatTile label="Total" value={`$${spend.total}`} tint={colors.text} />
          <StatTile label="Grocery" value={`$${spend.byCategory.grocery}`} tint={colors.text} />
          <StatTile label="Dining" value={`$${spend.byCategory.dining}`} tint={colors.text} />
        </View>
        <View style={{ flexDirection: 'row', marginHorizontal: -spacing.xs }}>
          <StatTile label="Alcohol $" value={`$${spend.byCategory.alcohol}`} tint={colors.alcohol} />
          <StatTile label="Std drinks" value={alcohol.standardDrinks} tint={colors.alcohol} />
          <StatTile label="Eating out" value={`${share}%`} tint={colors.carbs} />
        </View>
      </Card>

      <SectionTitle>Scan a receipt</SectionTitle>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
          <ScanLine color={colors.accent} size={18} strokeWidth={2.2} />
          <Text style={{ color: colors.subtext, fontSize: 13, flex: 1 }}>
            Photograph a paper receipt, or upload a screenshot of an online / email receipt. AI
            reads the merchant, total and items and fills in the expense.
          </Text>
        </View>
        {scanned?.uri && (
          <Image
            source={{ uri: scanned.uri }}
            style={{ width: '100%', height: 160, borderRadius: 12, marginBottom: spacing.md }}
            resizeMode="cover"
          />
        )}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button title="Photograph" icon={Camera} tone="neutral" onPress={() => scanReceipt('camera')} disabled={scanning} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Upload image" icon={Upload} tone="neutral" onPress={() => scanReceipt('library')} disabled={scanning} />
          </View>
        </View>
        {scanning && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md }}>
            <ActivityIndicator color={colors.accent} />
            <Text style={{ color: colors.subtext }}>Reading receipt…</Text>
          </View>
        )}
        {scanError && (
          <Text style={{ color: colors.danger, marginTop: spacing.sm, fontSize: 13 }}>{scanError}</Text>
        )}
        {scanned && !scanning && (
          <View style={{ marginTop: spacing.md }}>
            <Text style={{ color: colors.accent, fontWeight: '700' }}>
              Detected {scanned.merchant ? `· ${scanned.merchant}` : ''}
            </Text>
            {scanned.lineItems.slice(0, 6).map((it, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                <Text style={{ color: colors.subtext, fontSize: 13, flex: 1 }}>{it.name}</Text>
                <Text style={{ color: colors.subtext, fontSize: 13 }}>${it.price}</Text>
              </View>
            ))}
            {scanned.containsAlcohol && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <TriangleAlert color={colors.alcohol} size={14} strokeWidth={2.4} />
                <Text style={{ color: colors.alcohol, fontSize: 12 }}>Alcohol detected on this receipt</Text>
              </View>
            )}
            <Text style={{ color: colors.subtext, fontSize: 12, marginTop: spacing.sm }}>
              Review the fields below, then Add expense.
            </Text>
          </View>
        )}
      </Card>

      <SectionTitle>Add expense</SectionTitle>
      <Card>
        <Field label="Amount (USD)" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="42.50" />
        <Field label="Merchant (optional)" value={merchant} onChangeText={setMerchant} placeholder="Whole Foods" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>
        <Button title="Add expense" icon={Plus} onPress={addSpend} disabled={!amount} />
      </Card>

      <SectionTitle>Log a drink</SectionTitle>
      <Card>
        <Text style={{ color: colors.subtext, fontSize: 13, marginBottom: spacing.sm }}>
          Calories and standard drinks are estimated from volume × ABV.
        </Text>
        <Field label="Name" value={drinkName} onChangeText={setDrinkName} placeholder="IPA" />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Field label="Volume (ml)" keyboardType="decimal-pad" value={volume} onChangeText={setVolume} placeholder="355" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="ABV %" keyboardType="decimal-pad" value={abv} onChangeText={setAbv} placeholder="6.5" />
          </View>
        </View>
        <Button title="Log drink" icon={Wine} onPress={logDrink} tone="neutral" disabled={!volume || !abv} />
      </Card>

      <SectionTitle>Recent expenses</SectionTitle>
      {expenses.length === 0 && <Text style={{ color: colors.subtext }}>No expenses yet.</Text>}
      {expenses.slice(0, 15).map((e) => (
        <Card key={e.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>
              ${e.amount} · {e.category}
            </Text>
            <Text onPress={() => removeExpense(e.id)} style={{ color: colors.danger }}>
              Delete
            </Text>
          </View>
          <Text style={{ color: colors.subtext, fontSize: 12 }}>
            {e.at.slice(0, 10)}
            {e.merchant ? ` · ${e.merchant}` : ''}
            {e.source === 'receipt-scan' ? ' · scanned' : ''}
          </Text>
        </Card>
      ))}
    </ScrollView>
  );
}

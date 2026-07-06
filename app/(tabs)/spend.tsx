import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppStore } from '../../src/store/useAppStore';
import { Button, Card, Field, SectionTitle, StatTile } from '../../src/ui/components';
import { colors, spacing } from '../../src/ui/theme';
import { SpendCategory } from '../../src/domain/types';
import { diningShare, estimateDrinkCalories, summariseAlcohol, summariseSpend } from '../../src/domain/spend';

const CATEGORIES: SpendCategory[] = ['grocery', 'dining', 'alcohol', 'other'];

export default function SpendScreen() {
  const insets = useSafeAreaInsets();
  const { expenses, drinks, addExpense, removeExpense, addDrink } = useAppStore();

  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState<SpendCategory>('grocery');

  // Drink logging
  const [drinkName, setDrinkName] = useState('');
  const [volume, setVolume] = useState('');
  const [abv, setAbv] = useState('');

  const spend = summariseSpend(expenses);
  const alcohol = summariseAlcohol(drinks);
  const share = Math.round(diningShare(spend) * 100);

  function addSpend() {
    const v = Number(amount);
    if (!Number.isFinite(v) || v <= 0) return;
    addExpense({
      at: new Date().toISOString(),
      amount: v,
      currency: 'USD',
      category,
      merchant: merchant.trim() || undefined,
    });
    setAmount('');
    setMerchant('');
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
      contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.md }}
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

      <SectionTitle>Add expense</SectionTitle>
      <Card>
        <Field label="Amount (USD)" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="42.50" />
        <Field label="Merchant (optional)" value={merchant} onChangeText={setMerchant} placeholder="Whole Foods" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
          {CATEGORIES.map((c) => (
            <Text
              key={c}
              onPress={() => setCategory(c)}
              style={{
                color: category === c ? '#06210f' : colors.text,
                backgroundColor: category === c ? colors.accent : colors.cardAlt,
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 999,
                overflow: 'hidden',
                fontWeight: '600',
              }}
            >
              {c}
            </Text>
          ))}
        </View>
        <Button title="＋ Add expense" onPress={addSpend} disabled={!amount} />
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
        <Button title="🍺 Log drink" onPress={logDrink} tone="neutral" disabled={!volume || !abv} />
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
          </Text>
        </Card>
      ))}
    </ScrollView>
  );
}

import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Hand } from 'lucide-react-native';

import { useAppStore } from '../../src/store/useAppStore';
import { Card, MacroBar, SectionTitle, StatTile } from '../../src/ui/components';
import { colors, spacing, DOCK_CLEARANCE } from '../../src/ui/theme';
import { dailyTotalsFor } from '../../src/domain/nutrition';
import { summariseSpend, summariseAlcohol, expensesInRange } from '../../src/domain/spend';
import { latestWeight, weeklyRateKg } from '../../src/domain/weight';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const { meals, weights, expenses, drinks, hand } = useAppStore();
  const today = todayISO();

  const nutrition = dailyTotalsFor(meals, today);
  const todaysExpenses = expensesInRange(expenses, today, today);
  const spend = summariseSpend(todaysExpenses);
  const todaysDrinks = drinks.filter((d) => d.at.slice(0, 10) === today);
  const alcohol = summariseAlcohol(todaysDrinks);
  const last = latestWeight(weights);
  const rate = weeklyRateKg(weights);

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.md, paddingBottom: DOCK_CLEARANCE }}
    >
      <Text style={{ color: colors.text, fontSize: 28, fontWeight: '800', marginBottom: 2 }}>
        Today
      </Text>
      <Text style={{ color: colors.subtext, marginBottom: spacing.lg }}>{today}</Text>

      {!hand && (
        <Card style={{ borderColor: colors.accent }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 }}>
            <Hand color={colors.accent} size={18} strokeWidth={2.2} />
            <Text style={{ color: colors.text, fontWeight: '700' }}>Calibrate your hand</Text>
          </View>
          <Text style={{ color: colors.subtext }}>
            Set your hand size in Settings so photo-based calorie estimates use it as a stable
            scale reference.
          </Text>
        </Card>
      )}

      <SectionTitle>Nutrition</SectionTitle>
      <Card>
        <View style={{ flexDirection: 'row', marginBottom: spacing.md, marginHorizontal: -spacing.xs }}>
          <StatTile label="Calories" value={nutrition.calories} unit="kcal" />
          <StatTile label="Meals" value={nutrition.mealCount} tint={colors.text} />
        </View>
        <View style={{ flexDirection: 'row', marginHorizontal: -spacing.xs }}>
          <StatTile label="Protein" value={Math.round(nutrition.macros.protein)} unit="g" tint={colors.protein} />
          <StatTile label="Carbs" value={Math.round(nutrition.macros.carbs)} unit="g" tint={colors.carbs} />
          <StatTile label="Fat" value={Math.round(nutrition.macros.fat)} unit="g" tint={colors.fat} />
        </View>
        <MacroBar
          protein={nutrition.macros.protein}
          carbs={nutrition.macros.carbs}
          fat={nutrition.macros.fat}
        />
      </Card>

      <SectionTitle>Spend today</SectionTitle>
      <Card>
        <View style={{ flexDirection: 'row', marginHorizontal: -spacing.xs }}>
          <StatTile label="Grocery" value={`$${spend.byCategory.grocery}`} tint={colors.text} />
          <StatTile label="Dining" value={`$${spend.byCategory.dining}`} tint={colors.text} />
          <StatTile label="Alcohol" value={`$${spend.byCategory.alcohol}`} tint={colors.alcohol} />
        </View>
      </Card>

      <SectionTitle>Alcohol today</SectionTitle>
      <Card>
        <View style={{ flexDirection: 'row', marginHorizontal: -spacing.xs }}>
          <StatTile label="Std drinks" value={alcohol.standardDrinks} tint={colors.alcohol} />
          <StatTile label="Alcohol kcal" value={alcohol.calories} unit="kcal" tint={colors.alcohol} />
        </View>
      </Card>

      <SectionTitle>Weight</SectionTitle>
      <Card>
        <View style={{ flexDirection: 'row', marginHorizontal: -spacing.xs }}>
          <StatTile label="Latest" value={last ? last.kg : '—'} unit={last ? 'kg' : ''} />
          <StatTile
            label="Weekly rate"
            value={rate === 0 ? '—' : `${rate > 0 ? '+' : ''}${rate}`}
            unit={rate === 0 ? '' : 'kg/wk'}
            tint={rate <= 0 ? colors.accent : colors.protein}
          />
        </View>
        {last && (
          <Text style={{ color: colors.subtext, marginTop: spacing.sm, fontSize: 12 }}>
            Source: {last.source}
          </Text>
        )}
      </Card>
    </ScrollView>
  );
}

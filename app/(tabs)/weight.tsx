import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppStore } from '../../src/store/useAppStore';
import { Button, Card, Field, SectionTitle, StatTile } from '../../src/ui/components';
import { colors, spacing } from '../../src/ui/theme';
import { latestWeight, netChangeKg, trendWeight, weeklyRateKg } from '../../src/domain/weight';
import { parseHealthExport } from '../../src/services/health/exportParser';

export default function WeightScreen() {
  const insets = useSafeAreaInsets();
  const { weights, addWeight, addWeightBatch } = useAppStore();
  const [kg, setKg] = useState('');
  const [xml, setXml] = useState('');
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const last = latestWeight(weights);
  const trend = trendWeight(weights);
  const rate = weeklyRateKg(weights);
  const net = netChangeKg(weights);

  function addManual() {
    const v = Number(kg);
    if (!Number.isFinite(v) || v <= 0) return;
    addWeight({ at: new Date().toISOString(), kg: v, source: 'manual' });
    setKg('');
  }

  function importXml() {
    setImportMsg(null);
    const entries = parseHealthExport(xml);
    if (entries.length === 0) {
      setImportMsg('No body-mass records found in that text.');
      return;
    }
    const before = weights.length;
    addWeightBatch(entries);
    setImportMsg(`Parsed ${entries.length} weigh-ins from export.`);
    setXml('');
    void before;
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.md }}
    >
      <Text style={{ color: colors.text, fontSize: 28, fontWeight: '800', marginBottom: spacing.md }}>
        Weight
      </Text>

      <Card>
        <View style={{ flexDirection: 'row', marginHorizontal: -spacing.xs, marginBottom: spacing.sm }}>
          <StatTile label="Latest" value={last ? last.kg : '—'} unit={last ? 'kg' : ''} />
          <StatTile
            label="Net change"
            value={net === 0 ? '—' : `${net > 0 ? '+' : ''}${net}`}
            unit={net === 0 ? '' : 'kg'}
            tint={net <= 0 ? colors.accent : colors.protein}
          />
          <StatTile
            label="Per week"
            value={rate === 0 ? '—' : `${rate > 0 ? '+' : ''}${rate}`}
            unit={rate === 0 ? '' : 'kg'}
            tint={rate <= 0 ? colors.accent : colors.protein}
          />
        </View>
        {trend.length > 0 && (
          <Text style={{ color: colors.subtext, fontSize: 12 }}>
            Trend weight (smoothed): {trend[trend.length - 1].kg} kg
          </Text>
        )}
      </Card>

      <SectionTitle>Add weigh-in</SectionTitle>
      <Card>
        <Field label="Weight (kg)" keyboardType="decimal-pad" value={kg} onChangeText={setKg} placeholder="83.5" />
        <Button title="＋ Add" onPress={addManual} disabled={!kg} />
      </Card>

      <SectionTitle>Import from Apple Health / Renpho</SectionTitle>
      <Card>
        <Text style={{ color: colors.subtext, fontSize: 13, marginBottom: spacing.sm }}>
          In the Health app: Profile → Export All Health Data. Renpho weigh-ins that sync into Apple
          Health are picked up automatically. Paste the export.xml contents below.
        </Text>
        <Field
          label="export.xml"
          value={xml}
          onChangeText={setXml}
          placeholder="<HealthData>…"
          multiline
          numberOfLines={4}
          style={{ height: 90, textAlignVertical: 'top' }}
        />
        <Button title="Import weigh-ins" onPress={importXml} tone="neutral" disabled={!xml} />
        {importMsg && (
          <Text style={{ color: colors.accent, marginTop: spacing.sm, fontSize: 13 }}>{importMsg}</Text>
        )}
      </Card>

      <SectionTitle>History</SectionTitle>
      {weights.length === 0 && <Text style={{ color: colors.subtext }}>No weigh-ins yet.</Text>}
      {[...weights]
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 20)
        .map((w) => (
          <Card key={w.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{w.kg} kg</Text>
              <Text style={{ color: colors.subtext, fontSize: 12 }}>{w.source}</Text>
            </View>
            <Text style={{ color: colors.subtext, fontSize: 12 }}>
              {w.at.slice(0, 16).replace('T', ' ')}
            </Text>
          </Card>
        ))}
    </ScrollView>
  );
}

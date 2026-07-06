import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Plus, Upload, Camera, ScanLine } from 'lucide-react-native';

import { useAppStore } from '../../src/store/useAppStore';
import { Button, Card, Field, SectionTitle, StatTile } from '../../src/ui/components';
import { colors, spacing, DOCK_CLEARANCE } from '../../src/ui/theme';
import { latestWeight, netChangeKg, trendWeight, weeklyRateKg } from '../../src/domain/weight';
import { parseHealthExport } from '../../src/services/health/exportParser';
import { createVisionProvider } from '../../src/services/ai';

export default function WeightScreen() {
  const insets = useSafeAreaInsets();
  const { weights, ai, addWeight, addWeightBatch } = useAppStore();
  const [kg, setKg] = useState('');
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  async function importFile() {
    setImportMsg(null);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/xml', 'application/xml', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      setBusy(true);
      const text = await (await fetch(res.assets[0].uri)).text();
      const entries = parseHealthExport(text);
      if (entries.length === 0) {
        setImportMsg('No body-mass records found in that file.');
        return;
      }
      addWeightBatch(entries);
      setImportMsg(`Imported ${entries.length} weigh-ins from your export.`);
    } catch (e: any) {
      setImportMsg(e?.message ?? 'Could not read that file.');
    } finally {
      setBusy(false);
    }
  }

  async function scanWeight(from: 'camera' | 'library') {
    setImportMsg(null);
    const res =
      from === 'camera'
        ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6, mediaTypes: ['images'] })
        : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.6, mediaTypes: ['images'] });
    if (res.canceled || !res.assets?.[0]?.base64) return;
    setBusy(true);
    try {
      const provider = createVisionProvider(ai);
      const r = await provider.analyzeWeight({ imageBase64: res.assets[0].base64!, mimeType: 'image/jpeg' });
      if (r.kg == null) {
        setImportMsg('Could not read a weight from that image.');
        return;
      }
      addWeight({
        at: r.date ? `${r.date}T08:00:00.000Z` : new Date().toISOString(),
        kg: r.kg,
        source: 'renpho',
        bodyFatPct: r.bodyFatPct,
      });
      setImportMsg(`Added ${r.kg} kg${r.bodyFatPct ? ` · ${r.bodyFatPct}% body fat` : ''} from screenshot.`);
    } catch (e: any) {
      setImportMsg(e?.message ?? 'Could not read the screenshot.');
    } finally {
      setBusy(false);
    }
  }

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
        <Button title="Add" icon={Plus} onPress={addManual} disabled={!kg} />
      </Card>

      <SectionTitle>Import from Apple Health / Renpho</SectionTitle>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
          <ScanLine color={colors.accent} size={18} strokeWidth={2.2} />
          <Text style={{ color: colors.subtext, fontSize: 13, flex: 1 }}>
            Quickest: screenshot your Renpho / Apple Health weight and let AI read it. Or import your
            whole history from an Apple Health export file.
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button title="Scan screenshot" icon={Camera} tone="neutral" onPress={() => scanWeight('library')} disabled={busy} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Import file" icon={Upload} tone="neutral" onPress={importFile} disabled={busy} />
          </View>
        </View>
        {busy && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <ActivityIndicator color={colors.accent} />
            <Text style={{ color: colors.subtext }}>Working…</Text>
          </View>
        )}
        {importMsg && (
          <Text style={{ color: colors.accent, marginTop: spacing.sm, fontSize: 13 }}>{importMsg}</Text>
        )}
        <Text style={{ color: colors.subtext, fontSize: 11, marginTop: spacing.sm }}>
          Export file: Health app → Profile → Export All Health Data → unzip → export.xml. Renpho
          weigh-ins sync into Apple Health automatically.
        </Text>
      </Card>

      <SectionTitle>History</SectionTitle>
      {weights.length === 0 && <Text style={{ color: colors.subtext }}>No weigh-ins yet.</Text>}
      {[...weights]
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 20)
        .map((w) => (
          <Card key={w.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>
                {w.kg} kg{w.bodyFatPct ? ` · ${w.bodyFatPct}% fat` : ''}
              </Text>
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

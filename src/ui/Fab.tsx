/**
 * Centered floating "+" button that sits above the tab bar on every tab. It
 * opens a small sheet to log a meal three ways: manual entry, a camera photo,
 * or a screenshot of macros / a food list. Each option deep-links into the
 * Meals screen in the matching mode.
 */
import { useState } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Plus, X, Camera, PencilLine, ScanLine, type LucideIcon } from 'lucide-react-native';
import { colors, radius, spacing } from './theme';

const OPTIONS: { mode: string; label: string; hint: string; icon: LucideIcon }[] = [
  { mode: 'manual', label: 'Enter manually', hint: 'Type the name and macros', icon: PencilLine },
  { mode: 'camera', label: 'Camera photo', hint: 'AI estimates calories from a photo', icon: Camera },
  { mode: 'screenshot', label: 'Screenshot', hint: 'Read macros or a food list from an image', icon: ScanLine },
];

export function Fab() {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  function choose(mode: string) {
    setOpen(false);
    router.navigate(`/meals?mode=${mode}`);
  }

  return (
    <>
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 40, alignItems: 'center' }}
      >
        <TouchableOpacity
          accessibilityLabel="Log a meal"
          onPress={() => setOpen(true)}
          activeOpacity={0.85}
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.35,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }}
        >
          <Plus color="#06210f" size={30} strokeWidth={2.6} />
        </TouchableOpacity>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
              padding: spacing.lg,
              paddingBottom: insets.bottom + spacing.lg,
              gap: spacing.sm,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', flex: 1 }}>
                Log a meal
              </Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={10}>
                <X color={colors.subtext} size={22} />
              </TouchableOpacity>
            </View>
            {OPTIONS.map((o) => (
              <TouchableOpacity
                key={o.mode}
                onPress={() => choose(o.mode)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  backgroundColor: colors.cardAlt,
                  borderRadius: radius.md,
                  padding: spacing.md,
                }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentDim, alignItems: 'center', justifyContent: 'center' }}>
                  <o.icon color={colors.accent} size={20} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{o.label}</Text>
                  <Text style={{ color: colors.subtext, fontSize: 12 }}>{o.hint}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

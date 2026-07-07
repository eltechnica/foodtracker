/**
 * Slide-in side menu opened from the top-left menu icon. Gives quick access to
 * every section plus app actions (refresh / reset). Implemented as a Modal so
 * it overlays the tabs without restructuring navigation.
 */
import { Modal, Platform, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Scale,
  Wallet,
  ChefHat,
  Settings,
  RotateCw,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { colors, radius, spacing } from './theme';

const LINKS: { path: string; label: string; icon: LucideIcon }[] = [
  { path: '/', label: 'Today', icon: LayoutDashboard },
  { path: '/meals', label: 'Meals', icon: UtensilsCrossed },
  { path: '/weight', label: 'Weight', icon: Scale },
  { path: '/spend', label: 'Spend & alcohol', icon: Wallet },
  { path: '/recipes', label: 'Recipes', icon: ChefHat },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function SideMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const resetAll = useAppStore((s) => s.resetAll);

  function go(path: string) {
    onClose();
    router.navigate(path as never);
  }

  function refresh() {
    onClose();
    if (Platform.OS === 'web' && typeof location !== 'undefined') location.reload();
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View
          style={{
            width: 288,
            maxWidth: '82%',
            backgroundColor: colors.card,
            paddingTop: insets.top + spacing.lg,
            paddingBottom: insets.bottom + spacing.lg,
            paddingHorizontal: spacing.md,
            borderRightWidth: 1,
            borderRightColor: colors.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg, paddingHorizontal: spacing.sm }}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', flex: 1 }}>Menu</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <X color={colors.subtext} size={22} />
            </TouchableOpacity>
          </View>

          <ScrollView>
            {LINKS.map((l) => (
              <TouchableOpacity
                key={l.path}
                onPress={() => go(l.path)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderRadius: radius.md }}
              >
                <l.icon color={colors.text} size={20} strokeWidth={1.9} />
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{l.label}</Text>
              </TouchableOpacity>
            ))}

            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

            <TouchableOpacity
              onPress={refresh}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.sm }}
            >
              <RotateCw color={colors.accent} size={20} strokeWidth={2} />
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>Refresh / update</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                resetAll();
                onClose();
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.sm }}
            >
              <Trash2 color={colors.danger} size={20} strokeWidth={2} />
              <Text style={{ color: colors.danger, fontSize: 16, fontWeight: '600' }}>Reset all data</Text>
            </TouchableOpacity>
          </ScrollView>

          <Text style={{ color: colors.subtext, fontSize: 11, paddingHorizontal: spacing.sm }}>
            Ultimate Health Tracker
          </Text>
        </View>

        {/* Tap outside to close */}
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} onPress={onClose} />
      </View>
    </Modal>
  );
}

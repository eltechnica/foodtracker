/**
 * Custom top bar: a hamburger menu on the left and the app name. Used as the
 * header for every tab so the menu icon lives in the top-left corner and the
 * app is always branded. The current section is indicated by the active tab.
 */
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu, Salad } from 'lucide-react-native';
import { colors, spacing } from './theme';

export function AppHeader({ onMenu }: { title?: string; onMenu: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: colors.bg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md }}>
        <TouchableOpacity onPress={onMenu} hitSlop={12} accessibilityLabel="Open menu" style={{ padding: 6, marginRight: spacing.sm }}>
          <Menu color={colors.text} size={26} strokeWidth={2} />
        </TouchableOpacity>
        <Salad color={colors.accent} size={20} strokeWidth={2.2} />
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginLeft: spacing.sm }}>
          Food & Fit Tracker
        </Text>
      </View>
    </View>
  );
}

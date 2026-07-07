/**
 * Custom top bar with a hamburger menu on the left and the section title. Used
 * as the header for every tab so the menu icon lives in the top-left corner.
 */
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu } from 'lucide-react-native';
import { colors, spacing } from './theme';

export function AppHeader({ title, onMenu }: { title: string; onMenu: () => void }) {
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
        <TouchableOpacity onPress={onMenu} hitSlop={12} accessibilityLabel="Open menu" style={{ padding: 6, marginRight: spacing.xs }}>
          <Menu color={colors.text} size={26} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>{title}</Text>
      </View>
    </View>
  );
}

/**
 * Custom bottom tab bar. Replaces the default react-navigation bar because that
 * one clips the label descenders (y/g/p) on some devices. Here we control the
 * icon + label layout and the safe-area padding directly, so nothing is cut off.
 */
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Scale,
  Wallet,
  ChefHat,
  Settings,
  type LucideIcon,
} from 'lucide-react-native';
import { colors } from './theme';

const ICONS: Record<string, LucideIcon> = {
  index: LayoutDashboard,
  meals: UtensilsCrossed,
  weight: Scale,
  spend: Wallet,
  recipes: ChefHat,
  settings: Settings,
};

const PATHS: Record<string, string> = {
  index: '/',
  meals: '/meals',
  weight: '/weight',
  spend: '/spend',
  recipes: '/recipes',
  settings: '/settings',
};

// Must match expo.experiments.baseUrl in app.json (used only for the web path).
const WEB_BASE = '/foodtracker';

function navigateTo(path: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // On the static web host, drive navigation as a client-side transition so
    // the router re-renders in place (pushState alone doesn't trigger it).
    const full = path === '/' ? `${WEB_BASE}/` : `${WEB_BASE}${path}`;
    if (window.location.pathname !== full) {
      window.history.pushState(null, '', full);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  } else {
    router.navigate(path as never);
  }
}

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 8,
        paddingBottom: insets.bottom + 8,
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const color = focused ? colors.accent : colors.subtext;
        const Icon = ICONS[route.name] ?? LayoutDashboard;
        const label = (options.title as string) ?? route.name;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigateTo(PATHS[route.name] ?? '/');
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={label}
            onPress={onPress}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}
          >
            <Icon color={color} size={22} strokeWidth={focused ? 2.4 : 1.8} />
            <Text
              numberOfLines={1}
              style={{ color, fontSize: 11, fontWeight: '600', lineHeight: 16, marginTop: 3 }}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

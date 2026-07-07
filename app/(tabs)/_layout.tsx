import { useState } from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Scale,
  Wallet,
  ChefHat,
  Settings,
  type LucideIcon,
} from 'lucide-react-native';
import { colors, TAB_BAR_BASE_HEIGHT } from '../../src/ui/theme';
import { Fab } from '../../src/ui/Fab';
import { AppHeader } from '../../src/ui/AppHeader';
import { SideMenu } from '../../src/ui/SideMenu';

function tabIcon(Icon: LucideIcon) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Icon color={color} size={22} strokeWidth={focused ? 2.4 : 1.8} />
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Tabs
        screenOptions={{
          header: ({ options }) => (
            <AppHeader title={(options.title as string) ?? ''} onMenu={() => setMenuOpen(true)} />
          ),
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            height: TAB_BAR_BASE_HEIGHT + insets.bottom,
            paddingBottom: insets.bottom + 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.subtext,
          sceneStyle: { backgroundColor: colors.bg },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: tabIcon(LayoutDashboard) }} />
        <Tabs.Screen name="meals" options={{ title: 'Meals', tabBarIcon: tabIcon(UtensilsCrossed) }} />
        <Tabs.Screen name="weight" options={{ title: 'Weight', tabBarIcon: tabIcon(Scale) }} />
        <Tabs.Screen name="spend" options={{ title: 'Spend', tabBarIcon: tabIcon(Wallet) }} />
        <Tabs.Screen name="recipes" options={{ title: 'Recipes', tabBarIcon: tabIcon(ChefHat) }} />
        <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: tabIcon(Settings) }} />
      </Tabs>
      <Fab />
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  );
}

import { View } from 'react-native';
import { Tabs } from 'expo-router';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Scale,
  Wallet,
  ChefHat,
  Settings,
  type LucideIcon,
} from 'lucide-react-native';
import { colors } from '../../src/ui/theme';
import { Fab } from '../../src/ui/Fab';

function tabIcon(Icon: LucideIcon) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Icon color={color} size={22} strokeWidth={focused ? 2.4 : 1.8} />
  );
}

export default function TabsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
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
    </View>
  );
}

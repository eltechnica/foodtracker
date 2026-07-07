import { useState } from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { colors } from '../../src/ui/theme';
import { Fab } from '../../src/ui/Fab';
import { AppHeader } from '../../src/ui/AppHeader';
import { SideMenu } from '../../src/ui/SideMenu';
import { TabBar } from '../../src/ui/TabBar';

export default function TabsLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Tabs
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{
          header: ({ options }) => (
            <AppHeader title={(options.title as string) ?? ''} onMenu={() => setMenuOpen(true)} />
          ),
          sceneStyle: { backgroundColor: colors.bg },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Today' }} />
        <Tabs.Screen name="meals" options={{ title: 'Meals' }} />
        <Tabs.Screen name="weight" options={{ title: 'Weight' }} />
        <Tabs.Screen name="spend" options={{ title: 'Spend' }} />
        <Tabs.Screen name="recipes" options={{ title: 'Recipes' }} />
        <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
      </Tabs>
      <Fab />
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  );
}

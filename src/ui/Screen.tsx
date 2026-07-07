/**
 * Shared screen scaffold: a themed ScrollView with
 *  - keyboardShouldPersistTaps so a tap on a button registers on the first try
 *    even while a text field is focused (fixes "button does nothing" on mobile),
 *  - pull-to-refresh (native RefreshControl + a web touch handler, since iOS
 *    home-screen PWAs disable the browser's own pull-to-refresh),
 *  - consistent padding that clears the dock and floating button.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { colors, spacing, DOCK_CLEARANCE } from './theme';

async function refreshData() {
  try {
    await (useAppStore as unknown as { persist?: { rehydrate?: () => Promise<void> } }).persist?.rehydrate?.();
  } catch {
    /* ignore */
  }
  await new Promise((r) => setTimeout(r, 450));
}

export function Screen({ children }: { children: React.ReactNode }) {
  const [refreshing, setRefreshing] = useState(false);
  const [pull, setPull] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
    setPull(0);
  }, []);

  // Web pull-to-refresh: RefreshControl's gesture isn't wired up on web, so we
  // detect a downward drag at the top of the scroll area ourselves.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node: any =
      scrollRef.current && (scrollRef.current as any).getScrollableNode
        ? (scrollRef.current as any).getScrollableNode()
        : null;
    if (!node) return;
    let startY = 0;
    let active = false;
    const THRESHOLD = 70;
    const onStart = (e: TouchEvent) => {
      if (node.scrollTop <= 0) {
        startY = e.touches[0].clientY;
        active = true;
      }
    };
    const onMove = (e: TouchEvent) => {
      if (!active || refreshing) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 0 && node.scrollTop <= 0) setPull(Math.min(dy, 100));
    };
    const onEnd = () => {
      if (!active) return;
      active = false;
      setPull((p) => {
        if (p >= THRESHOLD && !refreshing) onRefresh();
        return p >= THRESHOLD ? p : 0;
      });
    };
    node.addEventListener('touchstart', onStart, { passive: true });
    node.addEventListener('touchmove', onMove, { passive: true });
    node.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      node.removeEventListener('touchstart', onStart);
      node.removeEventListener('touchmove', onMove);
      node.removeEventListener('touchend', onEnd);
    };
  }, [onRefresh, refreshing]);

  return (
    <ScrollView
      ref={scrollRef}
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: DOCK_CLEARANCE,
      }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
          progressBackgroundColor={colors.card}
        />
      }
    >
      {(pull > 0 || refreshing) && Platform.OS === 'web' && (
        <View style={{ height: refreshing ? 36 : Math.min(pull, 60), alignItems: 'center', justifyContent: 'center' }}>
          {refreshing ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Text style={{ color: colors.subtext, fontSize: 12 }}>
              {pull >= 70 ? 'Release to refresh' : 'Pull to refresh'}
            </Text>
          )}
        </View>
      )}
      {children}
    </ScrollView>
  );
}

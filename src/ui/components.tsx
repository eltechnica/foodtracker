/** Small reusable presentational components. */
import React from 'react';
import {
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, radius, spacing } from './theme';

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.lg,
          marginBottom: spacing.md,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        color: colors.subtext,
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: spacing.sm,
      }}
    >
      {children}
    </Text>
  );
}

export function StatTile({
  label,
  value,
  unit,
  tint = colors.accent,
}: {
  label: string;
  value: string | number;
  unit?: string;
  tint?: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        backgroundColor: colors.cardAlt,
        borderRadius: radius.md,
        padding: spacing.md,
        marginHorizontal: spacing.xs,
      }}
    >
      <Text numberOfLines={1} style={{ color: colors.subtext, fontSize: 12, marginBottom: 4 }}>
        {label}
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{ color: tint, fontSize: 20, fontWeight: '700' }}
      >
        {value}
        {unit ? <Text style={{ fontSize: 13, color: colors.subtext }}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

export function Button({
  title,
  onPress,
  tone = 'accent',
  disabled,
  icon: Icon,
}: {
  title: string;
  onPress: () => void;
  tone?: 'accent' | 'neutral' | 'danger';
  disabled?: boolean;
  icon?: LucideIcon;
}) {
  const bg =
    tone === 'accent' ? colors.accent : tone === 'danger' ? colors.danger : colors.cardAlt;
  const fg = tone === 'neutral' ? colors.text : '#06210f';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{
        backgroundColor: bg,
        opacity: disabled ? 0.5 : 1,
        borderRadius: radius.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        flexDirection: 'row',
        gap: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {Icon ? <Icon color={fg} size={17} strokeWidth={2.2} /> : null}
      <Text style={{ color: fg, fontWeight: '700', fontSize: 15 }}>{title}</Text>
    </TouchableOpacity>
  );
}

export function Field({
  label,
  ...props
}: TextInputProps & { label: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={{ color: colors.subtext, fontSize: 13, marginBottom: 4 }}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.subtext}
        {...props}
        style={[
          {
            backgroundColor: colors.cardAlt,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            color: colors.text,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            fontSize: 15,
          },
          props.style as object,
        ]}
      />
    </View>
  );
}

/** A selectable pill used for categories, meal types, providers, etc. */
export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: active ? colors.accent : colors.cardAlt,
        borderRadius: 999,
        paddingVertical: 8,
        paddingHorizontal: 14,
      }}
    >
      <Text style={{ color: active ? '#06210f' : colors.text, fontWeight: '600', fontSize: 13 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/** A macro bar showing protein/carbs/fat split. */
export function MacroBar({
  protein,
  carbs,
  fat,
}: {
  protein: number;
  carbs: number;
  fat: number;
}) {
  const total = protein + carbs + fat || 1;
  const seg = (v: number, c: string) => (
    <View style={{ flex: v / total, backgroundColor: c, height: 8 }} />
  );
  return (
    <View style={{ flexDirection: 'row', borderRadius: 4, overflow: 'hidden', marginTop: 6 }}>
      {seg(protein, colors.protein)}
      {seg(carbs, colors.carbs)}
      {seg(fat, colors.fat)}
    </View>
  );
}

import React from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { colors, spacing, borderRadius, typography } from "../../theme";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "default" | "large";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

const variantStyles: Record<Variant, { bg: string; text: string }> = {
  primary: { bg: colors.primary, text: "#000000" },
  secondary: { bg: colors.surfaceVariant, text: colors.text },
  danger: { bg: colors.error, text: "#FFFFFF" },
  ghost: { bg: "transparent", text: colors.primary },
};

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "default",
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const vs = variantStyles[variant];
  const height = size === "large" ? 64 : 48;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: vs.bg,
          height,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        },
        variant === "ghost" && styles.ghost,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={vs.text} />
      ) : (
        <Text
          style={[
            styles.text,
            { color: vs.text },
            size === "large" && styles.textLarge,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  ghost: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  text: {
    ...typography.body,
    fontWeight: "600",
  },
  textLarge: {
    fontSize: 18,
    fontWeight: "700",
  },
});

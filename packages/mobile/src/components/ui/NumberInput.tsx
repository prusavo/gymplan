import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, spacing, borderRadius, typography } from "../../theme";

interface NumberInputProps {
  label: string;
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  unit?: string;
  min?: number;
  formatValue?: (v: number) => string;
}

export function NumberInput({
  label,
  value,
  onIncrement,
  onDecrement,
  unit,
  min = 0,
  formatValue,
}: NumberInputProps) {
  const displayValue = formatValue ? formatValue(value) : String(value);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable
          onPress={onDecrement}
          disabled={value <= min}
          style={({ pressed }) => [
            styles.button,
            { opacity: value <= min ? 0.3 : pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={styles.buttonText}>-</Text>
        </Pressable>
        <View style={styles.valueContainer}>
          <Text style={styles.value}>{displayValue}</Text>
          {unit && <Text style={styles.unit}>{unit}</Text>}
        </View>
        <Pressable
          onPress={onIncrement}
          style={({ pressed }) => [
            styles.button,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={styles.buttonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surfaceVariant,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.primary,
  },
  valueContainer: {
    alignItems: "center",
    minWidth: 80,
  },
  value: {
    fontSize: 36,
    fontWeight: "700",
    color: colors.text,
  },
  unit: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

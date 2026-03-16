import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, typography } from "../../theme";

interface CountdownTimerProps {
  secondsLeft: number;
}

export function CountdownTimer({ secondsLeft }: CountdownTimerProps) {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const display = minutes > 0
    ? `${minutes}:${seconds.toString().padStart(2, "0")}`
    : `${seconds}`;

  const isUrgent = secondsLeft <= 5 && secondsLeft > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>REST</Text>
      <Text style={[styles.time, isUrgent && styles.urgent]}>{display}</Text>
      <Text style={styles.subLabel}>seconds remaining</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
  },
  label: {
    ...typography.h3,
    color: colors.textSecondary,
    letterSpacing: 4,
    marginBottom: spacing.sm,
  },
  time: {
    fontSize: 96,
    fontWeight: "700",
    color: colors.secondary,
    fontVariant: ["tabular-nums"],
  },
  urgent: {
    color: colors.warning,
  },
  subLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});

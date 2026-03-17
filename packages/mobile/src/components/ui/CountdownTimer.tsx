import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import { colors, spacing, typography } from "../../theme";

interface CountdownTimerProps {
  secondsLeft: number;
  totalSeconds?: number;
}

const RING_SIZE = 200;
const STROKE_WIDTH = 8;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CENTER = RING_SIZE / 2;

export function CountdownTimer({ secondsLeft, totalSeconds }: CountdownTimerProps) {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const display =
    minutes > 0
      ? `${minutes}:${seconds.toString().padStart(2, "0")}`
      : `${seconds}`;

  const isUrgent = secondsLeft <= 5 && secondsLeft > 0;

  const total = totalSeconds && totalSeconds > 0 ? totalSeconds : 1;
  const progress = Math.min(1, Math.max(0, secondsLeft / total));

  const backgroundPath = useMemo(() => {
    const path = Skia.Path.Make();
    path.addCircle(CENTER, CENTER, RADIUS);
    return path;
  }, []);

  const progressPath = useMemo(() => {
    const path = Skia.Path.Make();
    const startAngle = -90;
    const sweepAngle = progress * 360;
    const rect = Skia.XYWHRect(
      CENTER - RADIUS,
      CENTER - RADIUS,
      RADIUS * 2,
      RADIUS * 2
    );
    path.addArc(rect, startAngle, sweepAngle);
    return path;
  }, [progress]);

  const ringColor = isUrgent ? colors.warning : colors.secondary;

  return (
    <View style={styles.container}>
      <View style={styles.ringContainer}>
        <Canvas style={styles.canvas}>
          <Path
            path={backgroundPath}
            style="stroke"
            strokeWidth={STROKE_WIDTH}
            color={colors.surfaceVariant}
            strokeCap="round"
          />
          <Path
            path={progressPath}
            style="stroke"
            strokeWidth={STROKE_WIDTH}
            color={ringColor}
            strokeCap="round"
          />
        </Canvas>
        <View style={styles.timeOverlay}>
          <Text style={styles.label}>REST</Text>
          <Text style={[styles.time, isUrgent && styles.urgent]}>{display}</Text>
        </View>
      </View>
      <Text style={styles.subLabel}>seconds remaining</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  canvas: {
    width: RING_SIZE,
    height: RING_SIZE,
    position: "absolute",
  },
  timeOverlay: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    letterSpacing: 4,
    marginBottom: spacing.xs,
  },
  time: {
    fontSize: 56,
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
    marginTop: spacing.md,
  },
});

import React, { useMemo } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography } from "../../../src/theme";
import { Button } from "../../../src/components/ui/Button";
import { Card } from "../../../src/components/ui/Card";
import { useWorkoutStore, type LoggedSet } from "../../../src/stores/workoutStore";

export default function WorkoutSummaryScreen() {
  const store = useWorkoutStore();

  const stats = useMemo(() => {
    const sets = store.sets;
    const completedSets = sets.filter((s) => !s.skipped);
    const totalVolume = completedSets.reduce(
      (acc, s) => acc + (s.weightKg ?? 0) * s.repsCompleted,
      0
    );
    const uniqueExercises = new Set(sets.map((s) => s.gymPlanExerciseId)).size;

    let duration = "0:00";
    if (store.startedAt) {
      const start = new Date(store.startedAt).getTime();
      const end = Date.now();
      const mins = Math.floor((end - start) / 60000);
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      duration = hrs > 0
        ? `${hrs}h ${remMins}m`
        : `${remMins}m`;
    }

    return {
      totalSets: sets.length,
      completedSets: completedSets.length,
      skippedSets: sets.length - completedSets.length,
      totalVolume: Math.round(totalVolume),
      uniqueExercises,
      duration,
    };
  }, [store.sets, store.startedAt]);

  const handleDone = () => {
    store.completeWorkout();
    router.replace("/(tabs)/workout");
  };

  return (
    <>
      <Stack.Screen options={{ headerBackVisible: false, gestureEnabled: false }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Ionicons name="checkmark-circle" size={80} color={colors.success} />
          <Text style={styles.title}>Workout Complete!</Text>
          <Text style={styles.planName}>{store.activePlanName ?? "Workout"}</Text>
        </View>

        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{stats.duration}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalVolume.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Volume (kg)</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{stats.uniqueExercises}</Text>
            <Text style={styles.statLabel}>Exercises</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{stats.completedSets}</Text>
            <Text style={styles.statLabel}>Sets Completed</Text>
          </Card>
        </View>

        {stats.skippedSets > 0 && (
          <Text style={styles.skippedNote}>
            {stats.skippedSets} set{stats.skippedSets !== 1 ? "s" : ""} skipped
          </Text>
        )}

        <Button
          title="Done"
          onPress={handleDone}
          size="large"
          style={styles.doneButton}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  planName: {
    ...typography.body,
    color: colors.textSecondary,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    gap: spacing.xs,
  },
  statValue: {
    ...typography.h2,
    color: colors.primary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },
  skippedNote: {
    ...typography.bodySmall,
    color: colors.warning,
    textAlign: "center",
  },
  doneButton: {
    marginTop: spacing.md,
  },
});

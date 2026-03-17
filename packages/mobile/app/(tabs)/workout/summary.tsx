import React, { useMemo } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../../src/theme";
import { Button } from "../../../src/components/ui/Button";
import { Card } from "../../../src/components/ui/Card";
import { useWorkoutStore, type LoggedSet } from "../../../src/stores/workoutStore";
import { trpc } from "../../../src/api/trpc";

interface ExerciseSummary {
  exerciseId: string;
  name: string;
  sets: LoggedSet[];
  completedSets: number;
  skippedSets: number;
  volume: number;
  bestSet: { weightKg: number; reps: number } | null;
}

export default function WorkoutSummaryScreen() {
  const store = useWorkoutStore();

  // Fetch plan to get exercise names
  const planQuery = trpc.plan.getById.useQuery(
    { id: store.activePlanId! },
    { enabled: !!store.activePlanId }
  );
  const planExercises = planQuery.data?.exercises ?? [];

  const exerciseNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    planExercises.forEach((e: any) => {
      map[e.id] = e.exerciseName ?? "Exercise";
    });
    return map;
  }, [planExercises]);

  const stats = useMemo(() => {
    const sets = store.sets;
    const completedSets = sets.filter((s) => !s.skipped);
    const totalVolume = completedSets.reduce(
      (acc, s) => acc + (s.weightKg ?? 0) * s.repsCompleted,
      0
    );
    const totalReps = completedSets.reduce(
      (acc, s) => acc + s.repsCompleted,
      0
    );
    const uniqueExercises = new Set(sets.map((s) => s.gymPlanExerciseId))
      .size;

    let duration = "0m";
    let durationMinutes = 0;
    if (store.startedAt) {
      const start = new Date(store.startedAt).getTime();
      const end = Date.now();
      durationMinutes = Math.floor((end - start) / 60000);
      const hrs = Math.floor(durationMinutes / 60);
      const remMins = durationMinutes % 60;
      duration = hrs > 0 ? `${hrs}h ${remMins}m` : `${remMins}m`;
    }

    return {
      totalSets: sets.length,
      completedSets: completedSets.length,
      skippedSets: sets.length - completedSets.length,
      totalVolume: Math.round(totalVolume),
      totalReps,
      uniqueExercises,
      duration,
      durationMinutes,
    };
  }, [store.sets, store.startedAt]);

  // Per-exercise breakdown
  const exerciseSummaries = useMemo((): ExerciseSummary[] => {
    const exerciseOrder = store.exerciseIds;
    const summaries: ExerciseSummary[] = [];

    for (const exId of exerciseOrder) {
      const exSets = store.sets.filter(
        (s) => s.gymPlanExerciseId === exId
      );
      if (exSets.length === 0) continue;

      const completed = exSets.filter((s) => !s.skipped);
      const volume = completed.reduce(
        (acc, s) => acc + (s.weightKg ?? 0) * s.repsCompleted,
        0
      );

      let bestSet: { weightKg: number; reps: number } | null = null;
      for (const s of completed) {
        const w = s.weightKg ?? 0;
        if (
          !bestSet ||
          w > bestSet.weightKg ||
          (w === bestSet.weightKg && s.repsCompleted > bestSet.reps)
        ) {
          bestSet = { weightKg: w, reps: s.repsCompleted };
        }
      }

      summaries.push({
        exerciseId: exId,
        name: exerciseNameMap[exId] ?? "Exercise",
        sets: exSets,
        completedSets: completed.length,
        skippedSets: exSets.length - completed.length,
        volume: Math.round(volume),
        bestSet,
      });
    }

    return summaries;
  }, [store.sets, store.exerciseIds, exerciseNameMap]);

  const handleDone = () => {
    store.completeWorkout();
    router.replace("/(tabs)/workout");
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Workout Complete",
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons
            name="checkmark-circle"
            size={80}
            color={colors.success}
          />
          <Text style={styles.title}>Workout Complete!</Text>
          <Text style={styles.planName}>
            {store.activePlanName ?? "Workout"}
          </Text>
        </View>

        {/* Summary stats grid */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Ionicons name="time-outline" size={24} color={colors.primary} />
            <Text style={styles.statValue}>{stats.duration}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons
              name="barbell-outline"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.statValue}>
              {stats.totalVolume.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Volume (kg)</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons
              name="fitness-outline"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.statValue}>{stats.uniqueExercises}</Text>
            <Text style={styles.statLabel}>Exercises</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons
              name="layers-outline"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.statValue}>{stats.completedSets}</Text>
            <Text style={styles.statLabel}>Sets</Text>
          </Card>
        </View>

        {stats.skippedSets > 0 && (
          <Text style={styles.skippedNote}>
            {stats.skippedSets} set{stats.skippedSets !== 1 ? "s" : ""}{" "}
            skipped
          </Text>
        )}

        {/* Per-exercise breakdown */}
        {exerciseSummaries.length > 0 && (
          <View style={styles.breakdownSection}>
            <Text style={styles.sectionTitle}>Exercise Breakdown</Text>
            {exerciseSummaries.map((ex) => (
              <Card key={ex.exerciseId} style={styles.exerciseCard}>
                <View style={styles.exerciseCardHeader}>
                  <Text style={styles.exerciseCardName}>{ex.name}</Text>
                  <Text style={styles.exerciseCardSets}>
                    {ex.completedSets} set
                    {ex.completedSets !== 1 ? "s" : ""}
                    {ex.skippedSets > 0
                      ? ` (${ex.skippedSets} skipped)`
                      : ""}
                  </Text>
                </View>
                <View style={styles.exerciseCardStats}>
                  <View style={styles.exerciseCardStat}>
                    <Text style={styles.exerciseStatValue}>
                      {ex.volume.toLocaleString()}
                    </Text>
                    <Text style={styles.exerciseStatLabel}>kg volume</Text>
                  </View>
                  {ex.bestSet && (
                    <View style={styles.exerciseCardStat}>
                      <Text style={styles.exerciseStatValue}>
                        {ex.bestSet.weightKg}kg x {ex.bestSet.reps}
                      </Text>
                      <Text style={styles.exerciseStatLabel}>best set</Text>
                    </View>
                  )}
                </View>
                {/* Individual sets */}
                <View style={styles.setsBreakdown}>
                  {ex.sets.map((s) => (
                    <View
                      key={`${ex.exerciseId}-${s.setNumber}`}
                      style={styles.setRow}
                    >
                      <Text style={styles.setRowLabel}>
                        Set {s.setNumber}
                      </Text>
                      <Text
                        style={[
                          styles.setRowValue,
                          s.skipped && styles.setRowSkipped,
                        ]}
                      >
                        {s.skipped
                          ? "Skipped"
                          : `${s.weightKg ?? 0}kg x ${s.repsCompleted}`}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Total reps stat */}
        <View style={styles.totalRepsRow}>
          <Text style={styles.totalRepsLabel}>Total reps</Text>
          <Text style={styles.totalRepsValue}>{stats.totalReps}</Text>
        </View>

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
    paddingBottom: spacing.xl * 2,
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
    paddingVertical: spacing.md,
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

  // Breakdown section
  breakdownSection: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  exerciseCard: {
    gap: spacing.sm,
  },
  exerciseCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  exerciseCardName: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
    flex: 1,
  },
  exerciseCardSets: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  exerciseCardStats: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  exerciseCardStat: {
    gap: 2,
  },
  exerciseStatValue: {
    ...typography.body,
    color: colors.secondary,
    fontWeight: "600",
  },
  exerciseStatLabel: {
    ...typography.caption,
    color: colors.textDisabled,
  },
  setsBreakdown: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  setRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  setRowLabel: {
    ...typography.caption,
    color: colors.textDisabled,
  },
  setRowValue: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  setRowSkipped: {
    color: colors.warning,
    fontStyle: "italic",
  },

  // Total reps
  totalRepsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  totalRepsLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  totalRepsValue: {
    ...typography.h3,
    color: colors.primary,
  },

  doneButton: {
    marginTop: spacing.md,
  },
});

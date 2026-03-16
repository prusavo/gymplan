import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Vibration,
} from "react-native";
import { router, Stack } from "expo-router";
import * as Haptics from "expo-haptics";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { colors, spacing, borderRadius, typography } from "../../../src/theme";
import { Button } from "../../../src/components/ui/Button";
import { NumberInput } from "../../../src/components/ui/NumberInput";
import { CountdownTimer } from "../../../src/components/ui/CountdownTimer";
import { useWorkoutStore } from "../../../src/stores/workoutStore";
import { useCountdownTimer } from "../../../src/hooks/useCountdownTimer";
import { trpc } from "../../../src/api/trpc";

export default function ActiveWorkoutScreen() {
  const store = useWorkoutStore();
  const { secondsLeft, isActive: timerActive } = useCountdownTimer(
    store.restEndTime
  );

  const [weightKg, setWeightKg] = useState(0);
  const [reps, setReps] = useState(10);
  const [prevTimerActive, setPrevTimerActive] = useState(false);

  const logSetMutation = trpc.workout.logSet.useMutation();
  const skipSetMutation = trpc.workout.skipSet.useMutation();
  const completeMutation = trpc.workout.complete.useMutation();

  // Keep screen awake during workout
  useEffect(() => {
    activateKeepAwakeAsync("workout");
    return () => {
      deactivateKeepAwake("workout");
    };
  }, []);

  // Detect when rest timer finishes and vibrate
  useEffect(() => {
    if (prevTimerActive && !timerActive && store.isResting) {
      Vibration.vibrate([0, 500, 200, 500]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      store.endRest();
    }
    setPrevTimerActive(timerActive);
  }, [timerActive, prevTimerActive, store.isResting]);

  // Check if workout is complete and navigate to summary
  useEffect(() => {
    if (store.isWorkoutComplete()) {
      handleCompleteWorkout();
    }
  }, [store.currentSetNumber, store.currentExerciseIndex]);

  // Update default reps based on current exercise target
  useEffect(() => {
    const exerciseId = store.exerciseIds[store.currentExerciseIndex];
    if (exerciseId) {
      const target = store.targetRepsPerExercise[exerciseId] ?? 10;
      setReps(target);
    }
  }, [store.currentExerciseIndex]);

  const currentExerciseId = store.exerciseIds[store.currentExerciseIndex];
  const targetSets = currentExerciseId
    ? store.targetSetsPerExercise[currentExerciseId] ?? 3
    : 3;
  const exerciseComplete = store.currentSetNumber > targetSets;

  // Plan exercise detail query to get the exercise name
  const planQuery = trpc.plan.getById.useQuery(
    { id: store.activePlanId! },
    { enabled: !!store.activePlanId }
  );

  const planExercises = planQuery.data?.exercises ?? [];
  const currentPlanExercise = planExercises.find(
    (e: any) => e.id === currentExerciseId
  );
  const currentExerciseName =
    currentPlanExercise?.exerciseName ?? `Exercise ${store.currentExerciseIndex + 1}`;

  const handleLogSet = useCallback(async () => {
    if (!store.activeInstanceId || !currentExerciseId) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await logSetMutation.mutateAsync({
        instanceId: store.activeInstanceId,
        gymPlanExerciseId: currentExerciseId,
        setNumber: store.currentSetNumber,
        weightKg: weightKg > 0 ? weightKg : null,
        repsCompleted: reps,
      });
    } catch {
      // Continue even if API call fails - local state is source of truth
    }

    store.logSet(weightKg > 0 ? weightKg : null, reps);
  }, [
    store.activeInstanceId,
    currentExerciseId,
    store.currentSetNumber,
    weightKg,
    reps,
  ]);

  const handleSkipSet = useCallback(async () => {
    if (!store.activeInstanceId || !currentExerciseId) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await skipSetMutation.mutateAsync({
        instanceId: store.activeInstanceId,
        gymPlanExerciseId: currentExerciseId,
        setNumber: store.currentSetNumber,
      });
    } catch {
      // Continue locally
    }

    store.skipSet();
  }, [store.activeInstanceId, currentExerciseId, store.currentSetNumber]);

  const handleNextExercise = useCallback(() => {
    store.nextExercise();
  }, []);

  const handleCompleteWorkout = useCallback(async () => {
    if (!store.activeInstanceId) return;

    try {
      await completeMutation.mutateAsync({
        instanceId: store.activeInstanceId,
      });
    } catch {
      // Continue
    }

    router.replace("/(tabs)/workout/summary");
  }, [store.activeInstanceId]);

  const handleSkipRest = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    store.endRest();
  }, []);

  if (!store.activeInstanceId) {
    router.replace("/(tabs)/workout");
    return null;
  }

  // Rest timer overlay
  if (store.isResting && timerActive) {
    return (
      <>
        <Stack.Screen options={{ title: "Rest" }} />
        <View style={styles.restContainer}>
          <CountdownTimer secondsLeft={secondsLeft} />
          <Text style={styles.restNextLabel}>
            Next: Set {store.currentSetNumber} of {targetSets}
          </Text>
          <Button
            title="Skip Rest"
            onPress={handleSkipRest}
            variant="ghost"
            size="large"
            style={styles.skipRestButton}
          />
        </View>
      </>
    );
  }

  // Exercise complete - advance or finish
  if (exerciseComplete) {
    const isLastExercise =
      store.currentExerciseIndex >= store.exerciseIds.length - 1;

    if (isLastExercise) {
      // Will be handled by useEffect
      return (
        <View style={styles.container}>
          <Text style={styles.completingText}>Completing workout...</Text>
        </View>
      );
    }

    return (
      <>
        <Stack.Screen options={{ title: "Exercise Complete" }} />
        <View style={styles.exerciseCompleteContainer}>
          <Text style={styles.exerciseCompleteTitle}>Exercise Complete!</Text>
          <Text style={styles.exerciseCompleteName}>{currentExerciseName}</Text>
          <Text style={styles.exerciseCompleteNext}>
            Next: Exercise {store.currentExerciseIndex + 2} of{" "}
            {store.exerciseIds.length}
          </Text>
          <Button
            title="Next Exercise"
            onPress={handleNextExercise}
            size="large"
            style={styles.nextExerciseButton}
          />
        </View>
      </>
    );
  }

  // Main workout UI
  return (
    <>
      <Stack.Screen
        options={{ title: store.activePlanName ?? "Workout" }}
      />
      <View style={styles.container}>
        {/* Progress header */}
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>
            Exercise {store.currentExerciseIndex + 1}/{store.exerciseIds.length}
          </Text>
          <Text style={styles.progressDot}> -- </Text>
          <Text style={styles.progressText}>
            Set {store.currentSetNumber}/{targetSets}
          </Text>
        </View>

        {/* Exercise name */}
        <Text style={styles.exerciseName}>{currentExerciseName}</Text>

        {/* Set logged history for this exercise */}
        <View style={styles.setHistory}>
          {store.sets
            .filter((s) => s.gymPlanExerciseId === currentExerciseId)
            .map((s) => (
              <View key={`${s.setNumber}`} style={styles.setHistoryItem}>
                <Text style={styles.setHistoryText}>
                  Set {s.setNumber}:{" "}
                  {s.skipped
                    ? "Skipped"
                    : `${s.weightKg ?? 0}kg x ${s.repsCompleted}`}
                </Text>
              </View>
            ))}
        </View>

        {/* Weight & Reps inputs */}
        <View style={styles.inputsContainer}>
          <NumberInput
            label="Weight"
            value={weightKg}
            onIncrement={() => setWeightKg((v) => v + 2.5)}
            onDecrement={() => setWeightKg((v) => Math.max(0, v - 2.5))}
            unit="kg"
            min={0}
            formatValue={(v) => v.toFixed(1)}
          />
          <NumberInput
            label="Reps"
            value={reps}
            onIncrement={() => setReps((v) => v + 1)}
            onDecrement={() => setReps((v) => Math.max(0, v - 1))}
            min={0}
          />
        </View>

        {/* Action buttons */}
        <View style={styles.actionButtons}>
          <Button
            title="Complete Set"
            onPress={handleLogSet}
            size="large"
            loading={logSetMutation.isPending}
          />
          <Button
            title="Skip Set"
            onPress={handleSkipSet}
            variant="secondary"
            loading={skipSetMutation.isPending}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  progressText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  progressDot: {
    color: colors.textDisabled,
  },
  exerciseName: {
    ...typography.h1,
    color: colors.text,
    textAlign: "center",
    marginVertical: spacing.lg,
  },
  setHistory: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  setHistoryItem: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.sm,
  },
  setHistoryText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  inputsContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginVertical: spacing.lg,
  },
  actionButtons: {
    gap: spacing.sm,
    marginTop: "auto",
    paddingBottom: spacing.md,
  },
  restContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  restNextLabel: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  skipRestButton: {
    marginTop: spacing.xl,
    width: "100%",
  },
  exerciseCompleteContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  exerciseCompleteTitle: {
    ...typography.h1,
    color: colors.success,
  },
  exerciseCompleteName: {
    ...typography.h3,
    color: colors.textSecondary,
  },
  exerciseCompleteNext: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  nextExerciseButton: {
    width: "100%",
    marginTop: spacing.lg,
  },
  completingText: {
    ...typography.h3,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xl,
  },
});

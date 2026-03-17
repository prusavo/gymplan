import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Vibration,
  ScrollView,
  Pressable,
  SafeAreaView,
} from "react-native";
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { colors, spacing, borderRadius, typography } from "../../../src/theme";
import { Button } from "../../../src/components/ui/Button";
import { NumberInput } from "../../../src/components/ui/NumberInput";
import { CountdownTimer } from "../../../src/components/ui/CountdownTimer";
import { useToast } from "../../../src/components/ui/Toast";
import { useWorkoutStore } from "../../../src/stores/workoutStore";
import { useCountdownTimer } from "../../../src/hooks/useCountdownTimer";
import { trpc } from "../../../src/api/trpc";
import {
  playTimerCompleteSound,
  unloadTimerSound,
} from "../../../src/utils/sound";

export default function ActiveWorkoutScreen() {
  const store = useWorkoutStore();
  const { secondsLeft, isActive: timerActive } = useCountdownTimer(
    store.restEndTime
  );
  const { showToast } = useToast();

  const [weightKg, setWeightKg] = useState(0);
  const [reps, setReps] = useState(10);
  const [prevTimerActive, setPrevTimerActive] = useState(false);
  const [showExerciseList, setShowExerciseList] = useState(false);

  const logSetMutation = trpc.workout.logSet.useMutation();
  const skipSetMutation = trpc.workout.skipSet.useMutation();
  const completeMutation = trpc.workout.complete.useMutation();
  const abandonMutation = trpc.workout.abandon.useMutation();

  // Keep screen awake during workout, clean up sound on unmount
  useEffect(() => {
    activateKeepAwakeAsync("workout");
    return () => {
      deactivateKeepAwake("workout");
      unloadTimerSound();
    };
  }, []);

  // Detect when rest timer finishes: vibrate, haptic, and play sound
  useEffect(() => {
    if (prevTimerActive && !timerActive && store.isResting) {
      Vibration.vibrate([0, 500, 200, 500]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playTimerCompleteSound();
      store.endRest();
    }
    setPrevTimerActive(timerActive);
  }, [timerActive, prevTimerActive, store.isResting]);

  // Plan exercise detail query to get exercise names
  const planQuery = trpc.plan.getById.useQuery(
    { id: store.activePlanId! },
    { enabled: !!store.activePlanId }
  );

  const planExercises = planQuery.data?.exercises ?? [];

  // Build a map of exerciseId -> name
  const exerciseNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    planExercises.forEach((e: any) => {
      map[e.id] = e.exerciseName ?? "Exercise";
    });
    return map;
  }, [planExercises]);

  const currentExerciseId = store.exerciseIds[store.currentExerciseIndex];
  const targetSets = currentExerciseId
    ? store.targetSetsPerExercise[currentExerciseId] ?? 3
    : 3;
  const targetReps = currentExerciseId
    ? store.targetRepsPerExercise[currentExerciseId] ?? 10
    : 10;
  const exerciseComplete = store.currentSetNumber > targetSets;
  const currentExerciseName =
    exerciseNameMap[currentExerciseId ?? ""] ??
    `Exercise ${store.currentExerciseIndex + 1}`;

  const restTotalSeconds = currentExerciseId
    ? store.restSecondsPerExercise[currentExerciseId] ?? 90
    : 90;

  // Update default weight/reps based on current exercise target or last logged set
  useEffect(() => {
    if (!currentExerciseId) return;

    const target = store.targetRepsPerExercise[currentExerciseId] ?? 10;

    // Find the last completed (non-skipped) set for this exercise
    const previousSets = store.sets.filter(
      (s) => s.gymPlanExerciseId === currentExerciseId && !s.skipped
    );
    const lastSet =
      previousSets.length > 0 ? previousSets[previousSets.length - 1] : null;

    if (lastSet) {
      setWeightKg(lastSet.weightKg ?? 0);
      setReps(lastSet.repsCompleted);
    } else {
      setReps(target);
      // Keep weight at current value so user does not lose their setting
    }
  }, [store.currentExerciseIndex, store.currentSetNumber, currentExerciseId]);

  // Check if the entire workout is complete (all exercises, all sets)
  const allExercisesDone = useMemo(() => {
    if (store.exerciseIds.length === 0) return false;
    for (const exId of store.exerciseIds) {
      const target = store.targetSetsPerExercise[exId] ?? 3;
      const completed = store.sets.filter(
        (s) => s.gymPlanExerciseId === exId
      ).length;
      if (completed < target) return false;
    }
    return true;
  }, [store.exerciseIds, store.targetSetsPerExercise, store.sets]);

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

  const handlePreviousExercise = useCallback(() => {
    store.previousExercise();
  }, []);

  const handleGoToExercise = useCallback((index: number) => {
    store.goToExercise(index);
    setShowExerciseList(false);
  }, []);

  const handleCompleteWorkout = useCallback(async () => {
    if (!store.activeInstanceId) return;

    try {
      await completeMutation.mutateAsync({
        instanceId: store.activeInstanceId,
      });
      showToast("Workout completed!", "success");
    } catch {
      // Continue
    }

    router.replace("/(tabs)/workout/summary");
  }, [store.activeInstanceId]);

  const handleAbandonWorkout = useCallback(() => {
    Alert.alert(
      "Abandon Workout",
      "Are you sure you want to abandon this workout? All logged sets will be preserved, but the workout will be marked as abandoned.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Abandon",
          style: "destructive",
          onPress: async () => {
            if (!store.activeInstanceId) return;
            try {
              await abandonMutation.mutateAsync({
                instanceId: store.activeInstanceId,
              });
              showToast("Workout abandoned", "success");
            } catch {
              // Continue
            }
            store.clearWorkout();
            router.replace("/(tabs)/workout");
          },
        },
      ]
    );
  }, [store.activeInstanceId]);

  const handleSkipRest = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    store.endRest();
  }, []);

  if (!store.activeInstanceId) {
    router.replace("/(tabs)/workout");
    return null;
  }

  // --- Exercise list overlay ---
  if (showExerciseList) {
    return (
      <>
        <Stack.Screen options={{ title: "Exercises" }} />
        <SafeAreaView style={styles.container}>
          <View style={styles.exerciseListHeader}>
            <Text style={styles.exerciseListTitle}>Exercises</Text>
            <Pressable
              onPress={() => setShowExerciseList(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.exerciseListContent}>
            {store.exerciseIds.map((exId, index) => {
              const name =
                exerciseNameMap[exId] ?? `Exercise ${index + 1}`;
              const target = store.targetSetsPerExercise[exId] ?? 3;
              const completed = store.sets.filter(
                (s) => s.gymPlanExerciseId === exId
              ).length;
              const isCurrent = index === store.currentExerciseIndex;
              const isDone = completed >= target;

              return (
                <Pressable
                  key={exId}
                  onPress={() => handleGoToExercise(index)}
                  style={[
                    styles.exerciseListItem,
                    isCurrent && styles.exerciseListItemActive,
                  ]}
                >
                  <View style={styles.exerciseListIndex}>
                    {isDone ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color={colors.success}
                      />
                    ) : (
                      <Text style={styles.exerciseListIndexText}>
                        {index + 1}
                      </Text>
                    )}
                  </View>
                  <View style={styles.exerciseListInfo}>
                    <Text
                      style={[
                        styles.exerciseListName,
                        isCurrent && styles.exerciseListNameActive,
                      ]}
                    >
                      {name}
                    </Text>
                    <Text style={styles.exerciseListMeta}>
                      {completed}/{target} sets
                    </Text>
                  </View>
                  {isCurrent && (
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={colors.primary}
                    />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </>
    );
  }

  // --- Rest timer overlay ---
  if (store.isResting && timerActive) {
    return (
      <>
        <Stack.Screen options={{ title: "Rest" }} />
        <View style={styles.restContainer}>
          <CountdownTimer
            secondsLeft={secondsLeft}
            totalSeconds={restTotalSeconds}
          />
          <Text style={styles.restNextLabel}>
            Next: Set {store.currentSetNumber} of {targetSets}
          </Text>
          <Text style={styles.restExerciseName}>{currentExerciseName}</Text>
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

  // --- Exercise complete - advance or finish ---
  if (exerciseComplete) {
    const isLastExercise =
      store.currentExerciseIndex >= store.exerciseIds.length - 1;

    if (isLastExercise) {
      return (
        <>
          <Stack.Screen options={{ title: "Workout Complete" }} />
          <View style={styles.exerciseCompleteContainer}>
            <Ionicons
              name="checkmark-circle"
              size={80}
              color={colors.success}
            />
            <Text style={styles.exerciseCompleteTitle}>
              All Exercises Done!
            </Text>
            <Text style={styles.exerciseCompleteName}>
              {store.sets.length} sets logged
            </Text>
            <Button
              title="Complete Workout"
              onPress={handleCompleteWorkout}
              size="large"
              style={styles.nextExerciseButton}
              loading={completeMutation.isPending}
            />
            <Button
              title="Review Exercises"
              onPress={() => setShowExerciseList(true)}
              variant="secondary"
              style={styles.nextExerciseButton}
            />
          </View>
        </>
      );
    }

    const nextExerciseId =
      store.exerciseIds[store.currentExerciseIndex + 1];
    const nextExerciseName =
      exerciseNameMap[nextExerciseId ?? ""] ??
      `Exercise ${store.currentExerciseIndex + 2}`;

    return (
      <>
        <Stack.Screen options={{ title: "Exercise Complete" }} />
        <View style={styles.exerciseCompleteContainer}>
          <Ionicons
            name="checkmark-circle"
            size={64}
            color={colors.success}
          />
          <Text style={styles.exerciseCompleteTitle}>Exercise Complete!</Text>
          <Text style={styles.exerciseCompleteName}>
            {currentExerciseName}
          </Text>
          <View style={styles.nextExercisePreview}>
            <Text style={styles.nextLabel}>UP NEXT</Text>
            <Text style={styles.nextExercisePreviewName}>
              {nextExerciseName}
            </Text>
            <Text style={styles.exerciseCompleteNext}>
              Exercise {store.currentExerciseIndex + 2} of{" "}
              {store.exerciseIds.length}
            </Text>
          </View>
          <Button
            title="Next Exercise"
            onPress={handleNextExercise}
            size="large"
            style={styles.nextExerciseButton}
          />
          <Button
            title="View All Exercises"
            onPress={() => setShowExerciseList(true)}
            variant="secondary"
            style={styles.nextExerciseButton}
          />
        </View>
      </>
    );
  }

  // --- Main workout UI ---
  return (
    <>
      <Stack.Screen options={{ title: store.activePlanName ?? "Workout" }} />
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Exercise navigation header */}
          <View style={styles.navHeader}>
            <Pressable
              onPress={handlePreviousExercise}
              disabled={store.currentExerciseIndex === 0}
              style={[
                styles.navButton,
                store.currentExerciseIndex === 0 && styles.navButtonDisabled,
              ]}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={
                  store.currentExerciseIndex === 0
                    ? colors.textDisabled
                    : colors.text
                }
              />
            </Pressable>

            <Pressable
              onPress={() => setShowExerciseList(true)}
              style={styles.progressHeaderCenter}
            >
              <Text style={styles.progressText}>
                Exercise {store.currentExerciseIndex + 1}/
                {store.exerciseIds.length}
              </Text>
              <Ionicons
                name="list"
                size={16}
                color={colors.textSecondary}
              />
            </Pressable>

            <Pressable
              onPress={handleNextExercise}
              disabled={
                store.currentExerciseIndex >= store.exerciseIds.length - 1
              }
              style={[
                styles.navButton,
                store.currentExerciseIndex >=
                  store.exerciseIds.length - 1 && styles.navButtonDisabled,
              ]}
            >
              <Ionicons
                name="chevron-forward"
                size={24}
                color={
                  store.currentExerciseIndex >=
                  store.exerciseIds.length - 1
                    ? colors.textDisabled
                    : colors.text
                }
              />
            </Pressable>
          </View>

          {/* Exercise name and set indicator */}
          <Text style={styles.exerciseName}>{currentExerciseName}</Text>
          <View style={styles.setIndicatorRow}>
            {Array.from({ length: targetSets }, (_, i) => {
              const setNum = i + 1;
              const loggedSet = store.sets.find(
                (s) =>
                  s.gymPlanExerciseId === currentExerciseId &&
                  s.setNumber === setNum
              );
              const isCurrent = setNum === store.currentSetNumber;
              let bg: string = colors.surfaceVariant;
              let textColor: string = colors.textDisabled;
              if (loggedSet && !loggedSet.skipped) {
                bg = colors.success;
                textColor = "#FFFFFF";
              } else if (loggedSet?.skipped) {
                bg = colors.warning;
                textColor = "#000000";
              } else if (isCurrent) {
                bg = colors.primary;
                textColor = "#000000";
              }
              return (
                <View
                  key={setNum}
                  style={[styles.setDot, { backgroundColor: bg }]}
                >
                  <Text style={[styles.setDotText, { color: textColor }]}>
                    {setNum}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Target info */}
          <View style={styles.targetRow}>
            <Text style={styles.targetLabel}>Target</Text>
            <Text style={styles.targetValue}>{targetReps} reps</Text>
          </View>

          {/* Previous set performance */}
          {store.sets.filter(
            (s) =>
              s.gymPlanExerciseId === currentExerciseId && !s.skipped
          ).length > 0 && (
            <View style={styles.previousPerformance}>
              <Text style={styles.previousLabel}>Previous sets</Text>
              <View style={styles.previousSetsRow}>
                {store.sets
                  .filter(
                    (s) =>
                      s.gymPlanExerciseId === currentExerciseId &&
                      !s.skipped
                  )
                  .map((s) => (
                    <View
                      key={`prev-${s.setNumber}`}
                      style={styles.prevSetChip}
                    >
                      <Text style={styles.prevSetText}>
                        {s.weightKg ?? 0}kg x {s.repsCompleted}
                      </Text>
                    </View>
                  ))}
              </View>
            </View>
          )}

          {/* Weight & Reps inputs */}
          <View style={styles.inputsContainer}>
            <NumberInput
              label="Weight"
              value={weightKg}
              onIncrement={() =>
                setWeightKg((v) => +(v + 0.5).toFixed(1))
              }
              onDecrement={() =>
                setWeightKg((v) => Math.max(0, +(v - 0.5).toFixed(1)))
              }
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
              title={`Complete Set ${store.currentSetNumber}`}
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

          {/* Complete workout (available when all sets done) */}
          {allExercisesDone && (
            <Button
              title="Complete Workout"
              onPress={handleCompleteWorkout}
              size="large"
              loading={completeMutation.isPending}
              style={styles.completeWorkoutButton}
            />
          )}

          {/* Abandon workout */}
          <Pressable
            onPress={handleAbandonWorkout}
            style={styles.abandonButton}
          >
            <Ionicons
              name="close-circle-outline"
              size={18}
              color={colors.error}
            />
            <Text style={styles.abandonText}>Abandon Workout</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },

  // Navigation header
  navHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surfaceVariant,
    justifyContent: "center",
    alignItems: "center",
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  progressHeaderCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  progressText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: "600",
  },

  // Exercise name
  exerciseName: {
    ...typography.h1,
    color: colors.text,
    textAlign: "center",
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },

  // Set indicator dots
  setIndicatorRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  setDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  setDotText: {
    fontSize: 14,
    fontWeight: "700",
  },

  // Target
  targetRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  targetLabel: {
    ...typography.caption,
    color: colors.textDisabled,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  targetValue: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: "600",
  },

  // Previous performance
  previousPerformance: {
    marginVertical: spacing.sm,
    alignItems: "center",
    gap: spacing.xs,
  },
  previousLabel: {
    ...typography.caption,
    color: colors.textDisabled,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  previousSetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.xs,
  },
  prevSetChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.sm,
  },
  prevSetText: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  // Inputs
  inputsContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginVertical: spacing.lg,
  },

  // Action buttons
  actionButtons: {
    gap: spacing.sm,
  },

  // Complete workout button
  completeWorkoutButton: {
    marginTop: spacing.lg,
  },

  // Abandon
  abandonButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
  },
  abandonText: {
    ...typography.bodySmall,
    color: colors.error,
    fontWeight: "500",
  },

  // Rest timer
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
  restExerciseName: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.xs,
  },
  skipRestButton: {
    marginTop: spacing.xl,
    width: "100%",
  },

  // Exercise complete
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
  nextExercisePreview: {
    alignItems: "center",
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  nextLabel: {
    ...typography.caption,
    color: colors.primary,
    letterSpacing: 2,
    fontWeight: "700",
  },
  nextExercisePreviewName: {
    ...typography.h3,
    color: colors.text,
  },
  exerciseCompleteNext: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  nextExerciseButton: {
    width: "100%",
  },

  // Exercise list
  exerciseListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  exerciseListTitle: {
    ...typography.h2,
    color: colors.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceVariant,
    justifyContent: "center",
    alignItems: "center",
  },
  exerciseListContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  exerciseListItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exerciseListItemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceVariant,
  },
  exerciseListIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceVariant,
    justifyContent: "center",
    alignItems: "center",
  },
  exerciseListIndexText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: "700",
  },
  exerciseListInfo: {
    flex: 1,
    gap: 2,
  },
  exerciseListName: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
  },
  exerciseListNameActive: {
    color: colors.primary,
  },
  exerciseListMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

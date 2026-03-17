import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Pressable,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography } from "../../../src/theme";
import { Button } from "../../../src/components/ui/Button";
import { Card } from "../../../src/components/ui/Card";
import { LoadingScreen } from "../../../src/components/ui/LoadingScreen";
import { trpc } from "../../../src/api/trpc";
import { useWorkoutStore } from "../../../src/stores/workoutStore";

export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const utils = trpc.useUtils();

  const planQuery = trpc.plan.getById.useQuery({ id: id! });
  const startMutation = trpc.workout.start.useMutation();
  const deleteMutation = trpc.plan.delete.useMutation({
    onSuccess: () => {
      utils.plan.list.invalidate();
      router.back();
    },
  });

  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [optimisticExercises, setOptimisticExercises] = useState<any[] | null>(
    null
  );
  const previousOrderRef = useRef<any[] | null>(null);

  const reorderMutation = trpc.plan.update.useMutation({
    onSuccess: () => {
      utils.plan.getById.invalidate({ id: id! });
      setOptimisticExercises(null);
      previousOrderRef.current = null;
    },
    onError: (err) => {
      if (previousOrderRef.current) {
        setOptimisticExercises(previousOrderRef.current);
        previousOrderRef.current = null;
      }
      Alert.alert("Error", err?.message ?? "Failed to reorder exercises");
    },
  });

  const startWorkout = useWorkoutStore((s) => s.startWorkout);

  if (planQuery.isLoading) {
    return <LoadingScreen />;
  }

  const plan = planQuery.data;
  if (!plan) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Plan not found</Text>
      </View>
    );
  }

  const serverExercises = plan.exercises ?? [];
  const exercises = optimisticExercises ?? serverExercises;

  const moveExercise = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= exercises.length) return;
    if (reorderMutation.isPending) return;

    previousOrderRef.current = [...exercises];
    const reordered = [...exercises];
    [reordered[index], reordered[newIndex]] = [
      reordered[newIndex],
      reordered[index],
    ];
    setOptimisticExercises(reordered);

    reorderMutation.mutate({
      id: plan.id,
      exercises: reordered.map((e: any, i: number) => ({
        exerciseId: e.exerciseId,
        sortOrder: i,
        targetSets: e.targetSets,
        targetReps: e.targetReps,
        restSeconds: e.restSeconds,
        notes: e.notes || undefined,
      })),
    });
  };

  const handleStartWorkout = async () => {
    try {
      const result = await startMutation.mutateAsync({
        gymPlanId: plan.id,
      });

      startWorkout({
        instanceId: result.id,
        planId: plan.id,
        planName: plan.name,
        exercises: exercises.map((e: any) => ({
          gymPlanExerciseId: e.id,
          targetSets: e.targetSets,
          targetReps: e.targetReps,
          restSeconds: e.restSeconds,
        })),
      });

      router.push("/(tabs)/workout/active");
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to start workout");
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Plan", `Are you sure you want to delete "${plan.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMutation.mutate({ id: plan.id }),
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: plan.name }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{plan.name}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>
            {exercises.length} exercise{exercises.length !== 1 ? "s" : ""}
          </Text>
          {exercises.length > 1 && (
            <Pressable
              onPress={() => {
                setIsEditingOrder((prev) => !prev);
                if (isEditingOrder && !reorderMutation.isPending) {
                  setOptimisticExercises(null);
                }
              }}
              style={styles.editOrderToggle}
            >
              <Ionicons
                name={isEditingOrder ? "checkmark-circle" : "reorder-three"}
                size={18}
                color={isEditingOrder ? colors.success : colors.primary}
              />
              <Text
                style={[
                  styles.editOrderText,
                  { color: isEditingOrder ? colors.success : colors.primary },
                ]}
              >
                {isEditingOrder ? "Done" : "Edit Order"}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.exerciseList}>
          {exercises.map((ex: any, index: number) => (
            <Card key={ex.id ?? `ex-${index}`} style={styles.exerciseCard}>
              <View style={styles.orderBadge}>
                <Text style={styles.orderText}>{index + 1}</Text>
              </View>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>
                  {ex.exerciseName ?? "Exercise"}
                </Text>
                <Text style={styles.exerciseConfig}>
                  {ex.targetSets} sets x {ex.targetReps} reps
                  {"  "}
                  <Ionicons name="time-outline" size={12} color={colors.textSecondary} />{" "}
                  {ex.restSeconds}s rest
                </Text>
                {ex.notes && (
                  <Text style={styles.exerciseNotes}>{ex.notes}</Text>
                )}
              </View>
              {isEditingOrder && (
                <View style={styles.reorderActions}>
                  <Pressable
                    onPress={() => moveExercise(index, "up")}
                    style={styles.reorderButton}
                    disabled={index === 0 || reorderMutation.isPending}
                  >
                    <Ionicons
                      name="chevron-up"
                      size={22}
                      color={index === 0 ? colors.textDisabled : colors.text}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => moveExercise(index, "down")}
                    style={styles.reorderButton}
                    disabled={
                      index === exercises.length - 1 ||
                      reorderMutation.isPending
                    }
                  >
                    <Ionicons
                      name="chevron-down"
                      size={22}
                      color={
                        index === exercises.length - 1
                          ? colors.textDisabled
                          : colors.text
                      }
                    />
                  </Pressable>
                </View>
              )}
            </Card>
          ))}
        </View>

        <View style={styles.actions}>
          <Button
            title="Start Workout"
            onPress={handleStartWorkout}
            size="large"
            loading={startMutation.isPending}
          />
          <Button
            title="Edit Plan"
            onPress={() =>
              router.push({
                pathname: "/(tabs)/plans/builder",
                params: { editId: plan.id },
              })
            }
            variant="secondary"
          />
          <Button
            title="Delete Plan"
            onPress={handleDelete}
            variant="danger"
            loading={deleteMutation.isPending}
          />
        </View>
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
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  meta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  exerciseList: {
    gap: spacing.sm,
  },
  exerciseCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  orderBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryVariant,
    justifyContent: "center",
    alignItems: "center",
  },
  orderText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  exerciseInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  exerciseName: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
  },
  exerciseConfig: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  exerciseNotes: {
    ...typography.caption,
    color: colors.textDisabled,
    fontStyle: "italic",
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  editOrderToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  editOrderText: {
    ...typography.bodySmall,
    fontWeight: "600",
  },
  reorderActions: {
    gap: spacing.xs,
  },
  reorderButton: {
    width: 36,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
});

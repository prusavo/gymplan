import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
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

  const exercises = plan.exercises ?? [];

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
        <Text style={styles.meta}>
          {exercises.length} exercise{exercises.length !== 1 ? "s" : ""}
        </Text>

        <View style={styles.exerciseList}>
          {exercises.map((ex: any, index: number) => (
            <Card key={ex.id} style={styles.exerciseCard}>
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
});

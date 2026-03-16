import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography } from "../../../src/theme";
import { Card } from "../../../src/components/ui/Card";
import { Button } from "../../../src/components/ui/Button";
import { LoadingScreen } from "../../../src/components/ui/LoadingScreen";
import { EmptyState } from "../../../src/components/ui/EmptyState";
import { trpc } from "../../../src/api/trpc";
import { useWorkoutStore } from "../../../src/stores/workoutStore";

export default function WorkoutIndexScreen() {
  const activeInstanceId = useWorkoutStore((s) => s.activeInstanceId);
  const activePlanName = useWorkoutStore((s) => s.activePlanName);
  const resumeWorkout = useWorkoutStore((s) => s.resumeWorkout);

  const plansQuery = trpc.plan.list.useQuery();
  const plans = plansQuery.data ?? [];

  if (activeInstanceId) {
    return (
      <View style={styles.container}>
        <View style={styles.resumeContainer}>
          <Ionicons name="play-circle" size={80} color={colors.primary} />
          <Text style={styles.resumeTitle}>Workout In Progress</Text>
          <Text style={styles.resumePlan}>{activePlanName ?? "Workout"}</Text>
          <Button
            title="Resume Workout"
            onPress={() => {
              resumeWorkout();
              router.push("/(tabs)/workout/active");
            }}
            size="large"
            style={styles.resumeButton}
          />
          <Button
            title="Abandon Workout"
            onPress={() => {
              useWorkoutStore.getState().clearWorkout();
            }}
            variant="danger"
          />
        </View>
      </View>
    );
  }

  if (plansQuery.isLoading && !plansQuery.data) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Start a Workout</Text>
      <Text style={styles.subheading}>Choose a plan to begin</Text>

      <FlatList
        data={plans}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }: { item: any }) => (
          <Card
            onPress={() => router.push(`/(tabs)/plans/${item.id}`)}
            style={styles.planCard}
          >
            <View style={styles.planIcon}>
              <Ionicons
                name="clipboard-outline"
                size={24}
                color={colors.primary}
              />
            </View>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>{item.name}</Text>
              <Text style={styles.planMeta}>
                {item.exerciseCount ?? 0} exercise
                {(item.exerciseCount ?? 0) !== 1 ? "s" : ""}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textDisabled}
            />
          </Card>
        )}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <EmptyState
            icon="clipboard-outline"
            title="No plans available"
            message="Create a workout plan first, then start your workout here"
            actionLabel="Create Plan"
            onAction={() => router.push("/(tabs)/plans/builder")}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heading: {
    ...typography.h2,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  subheading: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  planIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceVariant,
    justifyContent: "center",
    alignItems: "center",
  },
  planInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  planName: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
  },
  planMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  resumeContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  resumeTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.md,
  },
  resumePlan: {
    ...typography.body,
    color: colors.textSecondary,
  },
  resumeButton: {
    width: "100%",
    marginTop: spacing.md,
  },
});

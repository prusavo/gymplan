import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { colors, spacing, borderRadius, typography } from "../../../src/theme";
import { Card } from "../../../src/components/ui/Card";
import { LoadingScreen } from "../../../src/components/ui/LoadingScreen";
import { ErrorState } from "../../../src/components/ui/ErrorState";
import { trpc } from "../../../src/api/trpc";

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const detailQuery = trpc.workout.getById.useQuery({ id: id! });

  if (detailQuery.isLoading) {
    return <LoadingScreen />;
  }

  if (detailQuery.isError) {
    return (
      <View style={styles.container}>
        <ErrorState
          message={detailQuery.error?.message}
          onRetry={() => detailQuery.refetch()}
        />
      </View>
    );
  }

  const workout = detailQuery.data;
  if (!workout) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Workout not found</Text>
      </View>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Group sets by exercise
  const exerciseGroups: Record<
    string,
    { name: string; sets: any[] }
  > = {};
  (workout.sets ?? []).forEach((s: any) => {
    const key = s.gymPlanExerciseId;
    if (!exerciseGroups[key]) {
      exerciseGroups[key] = {
        name: s.exerciseName ?? "Exercise",
        sets: [],
      };
    }
    exerciseGroups[key].sets.push(s);
  });

  return (
    <>
      <Stack.Screen
        options={{ title: workout.planName ?? "Workout Detail" }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.planName}>{workout.planName ?? "Workout"}</Text>
        <Text style={styles.date}>{formatDate(workout.startedAt)}</Text>

        {workout.notes && (
          <Text style={styles.notes}>{workout.notes}</Text>
        )}

        <View style={styles.exerciseList}>
          {Object.entries(exerciseGroups).map(([id, group]) => (
            <Card key={id} style={styles.exerciseCard}>
              <Text style={styles.exerciseName}>{group.name}</Text>
              <View style={styles.setsTable}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableCell, styles.headerText]}>Set</Text>
                  <Text style={[styles.tableCell, styles.headerText]}>
                    Weight
                  </Text>
                  <Text style={[styles.tableCell, styles.headerText]}>Reps</Text>
                </View>
                {group.sets
                  .sort((a: any, b: any) => a.setNumber - b.setNumber)
                  .map((s: any) => (
                    <View key={s.id ?? s.setNumber} style={styles.tableRow}>
                      <Text style={styles.tableCell}>{s.setNumber}</Text>
                      <Text style={styles.tableCell}>
                        {s.skipped
                          ? "--"
                          : `${s.weightKg ?? 0} kg`}
                      </Text>
                      <Text style={styles.tableCell}>
                        {s.skipped ? "Skipped" : s.repsCompleted}
                      </Text>
                    </View>
                  ))}
              </View>
            </Card>
          ))}
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
  planName: {
    ...typography.h2,
    color: colors.text,
  },
  date: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  notes: {
    ...typography.body,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  exerciseList: {
    gap: spacing.sm,
  },
  exerciseCard: {
    gap: spacing.sm,
  },
  exerciseName: {
    ...typography.h3,
    color: colors.text,
  },
  setsTable: {
    gap: spacing.xs,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: spacing.xs,
  },
  tableCell: {
    flex: 1,
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  headerText: {
    color: colors.text,
    fontWeight: "600",
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: "center",
    marginTop: spacing.xl,
  },
});

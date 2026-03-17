import React, { useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { colors, spacing, borderRadius, typography } from "../../../src/theme";
import { Card } from "../../../src/components/ui/Card";
import { LoadingScreen } from "../../../src/components/ui/LoadingScreen";
import { EmptyState } from "../../../src/components/ui/EmptyState";
import { ErrorState } from "../../../src/components/ui/ErrorState";
import { trpc } from "../../../src/api/trpc";

interface SetEntry {
  id: string;
  setNumber: number;
  weightKg: number | null;
  repsCompleted: number;
  completedAt: string;
  skipped: boolean;
  notes: string | null;
  instanceId: string;
  instanceStartedAt: string;
}

interface GroupedWorkout {
  date: string;
  instanceId: string;
  sets: SetEntry[];
}

export default function ExerciseHistoryScreen() {
  const { exerciseId, exerciseName } = useLocalSearchParams<{
    exerciseId: string;
    exerciseName?: string;
  }>();

  const historyQuery = trpc.progress.exerciseHistory.useQuery(
    { exerciseId: exerciseId!, limit: 50, offset: 0 },
    { enabled: !!exerciseId }
  );

  const sets: SetEntry[] = (historyQuery.data as any) ?? [];

  const grouped = useMemo((): GroupedWorkout[] => {
    const map: Record<string, GroupedWorkout> = {};
    for (const s of sets) {
      const dateKey = new Date(s.instanceStartedAt).toLocaleDateString(
        undefined,
        { weekday: "short", month: "short", day: "numeric", year: "numeric" }
      );
      if (!map[s.instanceId]) {
        map[s.instanceId] = { date: dateKey, instanceId: s.instanceId, sets: [] };
      }
      map[s.instanceId].sets.push(s);
    }
    return Object.values(map).sort(
      (a, b) =>
        new Date(b.sets[0].instanceStartedAt).getTime() -
        new Date(a.sets[0].instanceStartedAt).getTime()
    );
  }, [sets]);

  if (historyQuery.isLoading && !historyQuery.data) {
    return <LoadingScreen />;
  }

  if (historyQuery.isError) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{ title: exerciseName ?? "Exercise History" }}
        />
        <ErrorState
          message={historyQuery.error?.message}
          onRetry={() => historyQuery.refetch()}
        />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{ title: exerciseName ? `${exerciseName} History` : "Exercise History" }}
      />
      <View style={styles.container}>
        <FlatList
          data={grouped}
          keyExtractor={(item) => item.instanceId}
          renderItem={({ item }) => (
            <Card style={styles.workoutCard}>
              <Text style={styles.dateHeader}>{item.date}</Text>
              <View style={styles.setsTable}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableCell, styles.headerText]}>Set</Text>
                  <Text style={[styles.tableCell, styles.headerText]}>Weight</Text>
                  <Text style={[styles.tableCell, styles.headerText]}>Reps</Text>
                </View>
                {item.sets
                  .sort((a, b) => a.setNumber - b.setNumber)
                  .map((s) => (
                    <View key={s.id ?? `${s.instanceId}-${s.setNumber}`} style={styles.tableRow}>
                      <Text style={styles.tableCell}>{s.setNumber}</Text>
                      <Text style={styles.tableCell}>
                        {s.skipped ? "--" : `${s.weightKg ?? 0} kg`}
                      </Text>
                      <Text style={styles.tableCell}>
                        {s.skipped ? "Skipped" : s.repsCompleted}
                      </Text>
                    </View>
                  ))}
              </View>
            </Card>
          )}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          refreshControl={
            <RefreshControl
              refreshing={historyQuery.isRefetching}
              onRefresh={() => historyQuery.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="analytics-outline"
              title="No history yet"
              message="Complete workouts with this exercise to see your history"
            />
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  workoutCard: {
    gap: spacing.sm,
  },
  dateHeader: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
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
});

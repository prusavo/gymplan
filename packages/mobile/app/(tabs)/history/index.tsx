import React from "react";
import { View, Text, FlatList, StyleSheet, Pressable, RefreshControl } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography } from "../../../src/theme";
import { Card } from "../../../src/components/ui/Card";
import { LoadingScreen } from "../../../src/components/ui/LoadingScreen";
import { EmptyState } from "../../../src/components/ui/EmptyState";
import { ErrorState } from "../../../src/components/ui/ErrorState";
import { trpc } from "../../../src/api/trpc";

export default function HistoryListScreen() {
  const historyQuery = trpc.workout.history.useQuery({
    limit: 50,
    offset: 0,
  });

  const workouts = historyQuery.data?.instances ?? [];

  if (historyQuery.isLoading && !historyQuery.data) {
    return <LoadingScreen />;
  }

  if (historyQuery.isError) {
    return (
      <View style={styles.container}>
        <ErrorState
          message={historyQuery.error?.message}
          onRetry={() => historyQuery.refetch()}
        />
      </View>
    );
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return "--";
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.progressLink}
        onPress={() => router.push("/(tabs)/history/progress")}
      >
        <Ionicons name="trending-up" size={20} color={colors.primary} />
        <Text style={styles.progressLinkText}>View Progress Charts</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
      </Pressable>

      <Pressable
        style={styles.progressLink}
        onPress={() => router.push("/(tabs)/history/records")}
      >
        <Ionicons name="trophy-outline" size={20} color={colors.secondary} />
        <Text style={[styles.progressLinkText, { color: colors.secondary }]}>
          Personal Records
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
      </Pressable>

      <FlatList
        data={workouts}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }: { item: any }) => (
          <Card
            onPress={() => router.push(`/(tabs)/history/${item.id}`)}
            style={styles.workoutCard}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.planName}>
                {item.planName ?? "Workout"}
              </Text>
              <Text style={styles.date}>{formatDate(item.startedAt)}</Text>
            </View>
            <View style={styles.cardStats}>
              <View style={styles.stat}>
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text style={styles.statText}>
                  {formatDuration(item.startedAt, item.completedAt)}
                </Text>
              </View>
              {item.totalVolume != null && (
                <View style={styles.stat}>
                  <Ionicons
                    name="barbell-outline"
                    size={14}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.statText}>
                    {Math.round(item.totalVolume).toLocaleString()} kg
                  </Text>
                </View>
              )}
              <View style={styles.stat}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={14}
                  color={
                    item.status === "completed"
                      ? colors.success
                      : colors.warning
                  }
                />
                <Text style={styles.statText}>
                  {item.status === "completed" ? "Completed" : "Abandoned"}
                </Text>
              </View>
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
            icon="time-outline"
            title="No workout history"
            message="Complete your first workout to see it here"
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
  progressLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressLinkText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: "600",
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  workoutCard: {
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planName: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
  },
  date: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  cardStats: {
    flexDirection: "row",
    gap: spacing.md,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  statText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

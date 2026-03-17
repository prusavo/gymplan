import React from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography } from "../../../src/theme";
import { Card } from "../../../src/components/ui/Card";
import { LoadingScreen } from "../../../src/components/ui/LoadingScreen";
import { EmptyState } from "../../../src/components/ui/EmptyState";
import { ErrorState } from "../../../src/components/ui/ErrorState";
import { trpc } from "../../../src/api/trpc";

export default function PersonalRecordsScreen() {
  const recordsQuery = trpc.progress.personalRecords.useQuery();
  const records = recordsQuery.data ?? [];

  if (recordsQuery.isLoading && !recordsQuery.data) {
    return <LoadingScreen />;
  }

  if (recordsQuery.isError) {
    return (
      <View style={styles.container}>
        <ErrorState
          message={recordsQuery.error?.message}
          onRetry={() => recordsQuery.refetch()}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={records}
        keyExtractor={(item: any) => item.exerciseId}
        renderItem={({ item }: { item: any }) => (
          <Card style={styles.recordCard}>
            <Text style={styles.exerciseName}>{item.exerciseName}</Text>
            <View style={styles.badges}>
              {item.maxWeight != null && (
                <View style={styles.badge}>
                  <Text style={styles.badgeIcon}>
                    <Ionicons name="barbell" size={14} color={colors.primary} />
                  </Text>
                  <Text style={styles.badgeText}>{item.maxWeight} kg</Text>
                </View>
              )}
              {item.maxReps != null && (
                <View style={styles.badge}>
                  <Text style={styles.badgeIcon}>
                    <Ionicons name="fitness" size={14} color={colors.secondary} />
                  </Text>
                  <Text style={styles.badgeText}>{item.maxReps} reps</Text>
                </View>
              )}
              {item.maxVolume != null && (
                <View style={styles.badge}>
                  <Text style={styles.badgeIcon}>
                    <Ionicons name="analytics" size={14} color={colors.success} />
                  </Text>
                  <Text style={styles.badgeText}>{Math.round(item.maxVolume)} kg total</Text>
                </View>
              )}
            </View>
            {item.achievedAt && (
              <Text style={styles.achievedDate}>
                Achieved {new Date(item.achievedAt).toLocaleDateString()}
              </Text>
            )}
          </Card>
        )}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        refreshControl={
          <RefreshControl
            refreshing={recordsQuery.isRefetching}
            onRefresh={() => recordsQuery.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="trophy-outline"
            title="No personal records yet"
            message="Complete workouts to start tracking your personal records"
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
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  recordCard: {
    gap: spacing.sm,
  },
  exerciseName: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  badgeIcon: {
    fontSize: 14,
  },
  badgeText: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: "500",
  },
  achievedDate: {
    ...typography.caption,
    color: colors.textDisabled,
  },
});

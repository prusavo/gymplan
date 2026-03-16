import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";
import { colors, spacing, typography } from "../../../src/theme";
import { Card } from "../../../src/components/ui/Card";
import { LoadingScreen } from "../../../src/components/ui/LoadingScreen";
import { EmptyState } from "../../../src/components/ui/EmptyState";
import { trpc } from "../../../src/api/trpc";

export default function PlanListScreen() {
  const plansQuery = trpc.plan.list.useQuery();
  const plans = plansQuery.data ?? [];

  if (plansQuery.isLoading && !plansQuery.data) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={plans}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }: { item: any }) => (
          <Card
            onPress={() => router.push(`/(tabs)/plans/${item.id}`)}
            style={styles.planCard}
          >
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
            title="No plans yet"
            message="Create a workout plan to organize your exercises"
            actionLabel="Create Plan"
            onAction={() => router.push("/(tabs)/plans/builder")}
          />
        }
      />

      <Pressable
        style={styles.fab}
        onPress={() => router.push("/(tabs)/plans/builder")}
      >
        <Ionicons name="add" size={28} color="#000000" />
      </Pressable>
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
  planCard: {
    flexDirection: "row",
    justifyContent: "space-between",
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
  fab: {
    position: "absolute",
    bottom: spacing.lg,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});

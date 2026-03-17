import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  FlatList,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography } from "../../../src/theme";
import { Card } from "../../../src/components/ui/Card";
import { LoadingScreen } from "../../../src/components/ui/LoadingScreen";
import { EmptyState } from "../../../src/components/ui/EmptyState";
import { ErrorState } from "../../../src/components/ui/ErrorState";
import { trpc } from "../../../src/api/trpc";

export default function ProgressScreen() {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null
  );
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>("");
  const [showPicker, setShowPicker] = useState(false);

  const exercisesQuery = trpc.exercise.list.useQuery({
    limit: 100,
    cursor: 0,
  });
  const exercises = exercisesQuery.data?.exercises ?? [];

  const progressQuery = trpc.progress.exerciseHistory.useQuery(
    { exerciseId: selectedExerciseId!, limit: 50, offset: 0 },
    { enabled: !!selectedExerciseId }
  );

  // API returns a flat array directly, not { sets: [...] }
  const historyData: any[] = (progressQuery.data as any) ?? [];

  // Simple chart: show weight progression as bars
  const maxWeight = historyData.reduce(
    (max: number, s: any) => Math.max(max, s.weightKg ?? 0),
    0
  );

  if (progressQuery.isError && selectedExerciseId) {
    return (
      <View style={styles.container}>
        <ErrorState
          message={progressQuery.error?.message}
          onRetry={() => progressQuery.refetch()}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={
            (!!selectedExerciseId && progressQuery.isRefetching) ||
            exercisesQuery.isRefetching
          }
          onRefresh={() => {
            exercisesQuery.refetch();
            if (selectedExerciseId) progressQuery.refetch();
          }}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <Pressable
        style={styles.exercisePicker}
        onPress={() => setShowPicker(true)}
      >
        <Text
          style={[
            styles.pickerText,
            !selectedExerciseId && { color: colors.textDisabled },
          ]}
        >
          {selectedExerciseName || "Select an exercise"}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
      </Pressable>

      {!selectedExerciseId && (
        <EmptyState
          icon="trending-up"
          title="Select an Exercise"
          message="Choose an exercise above to see your progress over time"
        />
      )}

      {selectedExerciseId && progressQuery.isLoading && <LoadingScreen />}

      {selectedExerciseId && !progressQuery.isLoading && historyData.length === 0 && (
        <EmptyState
          icon="analytics-outline"
          title="No data yet"
          message="Complete workouts with this exercise to see your progress"
        />
      )}

      {historyData.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Weight Progression</Text>
          <Card style={styles.chartCard}>
            <View style={styles.barChart}>
              {historyData.slice(-20).map((entry: any, index: number) => {
                const weight = entry.weightKg ?? 0;
                const heightPercent =
                  maxWeight > 0 ? (weight / maxWeight) * 100 : 0;
                return (
                  <View key={index} style={styles.barWrapper}>
                    <Text style={styles.barValue}>
                      {weight > 0 ? Math.round(weight) : ""}
                    </Text>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${Math.max(heightPercent, 5)}%`,
                          backgroundColor:
                            weight === maxWeight
                              ? colors.success
                              : colors.primary,
                        },
                      ]}
                    />
                    <Text style={styles.barLabel}>
                      {new Date(entry.completedAt).getDate()}
                    </Text>
                  </View>
                );
              })}
            </View>
            <Text style={styles.chartSubtitle}>
              Best: {maxWeight}kg
            </Text>
          </Card>

          <Text style={styles.chartTitle}>Recent Sets</Text>
          {historyData.slice(0, 20).map((entry: any, index: number) => (
            <Card key={index} style={styles.setRow}>
              <Text style={styles.setDate}>
                {new Date(entry.completedAt).toLocaleDateString()}
              </Text>
              <Text style={styles.setDetail}>
                {entry.weightKg ?? 0}kg x {entry.repsCompleted} reps
              </Text>
            </Card>
          ))}
        </View>
      )}

      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowPicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Exercise</Text>
            <FlatList
              data={exercises}
              keyExtractor={(item: any) => item.id}
              renderItem={({ item }: { item: any }) => (
                <Pressable
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedExerciseId(item.id);
                    setSelectedExerciseName(item.name);
                    setShowPicker(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.name}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
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
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  exercisePicker: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 48,
  },
  pickerText: {
    ...typography.body,
    color: colors.text,
  },
  chartContainer: {
    gap: spacing.md,
  },
  chartTitle: {
    ...typography.h3,
    color: colors.text,
  },
  chartCard: {
    gap: spacing.sm,
  },
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 150,
    gap: 2,
  },
  barWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
  },
  bar: {
    width: "80%",
    borderRadius: borderRadius.sm,
    minHeight: 4,
  },
  barValue: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 9,
    marginBottom: 2,
  },
  barLabel: {
    ...typography.caption,
    color: colors.textDisabled,
    fontSize: 9,
    marginTop: 2,
  },
  chartSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
  },
  setRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  setDate: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  setDetail: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: "60%",
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  modalItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  modalItemText: {
    ...typography.body,
    color: colors.text,
  },
});

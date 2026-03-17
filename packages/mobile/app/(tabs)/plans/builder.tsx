import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  Pressable,
  Animated,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography } from "../../../src/theme";
import { Button } from "../../../src/components/ui/Button";
import { Card } from "../../../src/components/ui/Card";
import { NumberInput } from "../../../src/components/ui/NumberInput";
import { trpc } from "../../../src/api/trpc";
import {
  DEFAULT_REST_SECONDS,
  DEFAULT_TARGET_REPS,
  DEFAULT_TARGET_SETS,
} from "@gymplan/shared";

interface PlanExerciseEntry {
  key: string;
  exerciseId: string;
  exerciseName: string;
  targetSets: number;
  targetReps: number;
  restSeconds: number;
  notes: string;
}

function useCardLongPress() {
  const scale = useRef(new Animated.Value(1)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;

  const onLongPress = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1.03,
        useNativeDriver: true,
      }),
      Animated.timing(bgOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  }, [scale, bgOpacity]);

  const onPressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(bgOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  }, [scale, bgOpacity]);

  const backgroundColor = bgOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: ["transparent", colors.surfaceVariant],
  });

  return { scale, backgroundColor, onLongPress, onPressOut };
}

function AnimatedExerciseCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  const { scale, backgroundColor, onLongPress, onPressOut } =
    useCardLongPress();

  return (
    <Pressable onLongPress={onLongPress} onPressOut={onPressOut} delayLongPress={200}>
      <Animated.View
        style={[
          { transform: [{ scale }], backgroundColor, borderRadius: borderRadius.md },
        ]}
      >
        <Card style={style}>{children}</Card>
      </Animated.View>
    </Pressable>
  );
}

export default function PlanBuilderScreen() {
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const isEditing = !!editId;

  const [name, setName] = useState("");
  const [exercises, setExercises] = useState<PlanExerciseEntry[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const planQuery = trpc.plan.getById.useQuery(
    { id: editId! },
    { enabled: isEditing }
  );

  const categoriesQuery = trpc.category.list.useQuery();
  const categories = categoriesQuery.data ?? [];

  const exercisesQuery = trpc.exercise.list.useQuery({
    search: exerciseSearch || undefined,
    categoryId: selectedCategory ?? undefined,
    limit: 50,
    cursor: 0,
  });

  const availableExercises = exercisesQuery.data?.exercises ?? [];

  useEffect(() => {
    if (planQuery.data) {
      const plan = planQuery.data;
      setName(plan.name);
      setExercises(
        (plan.exercises ?? []).map((e: any, i: number) => ({
          key: `${e.exerciseId}-${i}`,
          exerciseId: e.exerciseId,
          exerciseName: e.exerciseName ?? "Exercise",
          targetSets: e.targetSets,
          targetReps: e.targetReps,
          restSeconds: e.restSeconds,
          notes: e.notes ?? "",
        }))
      );
    }
  }, [planQuery.data]);

  const createMutation = trpc.plan.create.useMutation({
    onSuccess: () => {
      utils.plan.list.invalidate();
      router.back();
    },
  });

  const updateMutation = trpc.plan.update.useMutation({
    onSuccess: () => {
      utils.plan.list.invalidate();
      utils.plan.getById.invalidate({ id: editId! });
      router.back();
    },
  });

  const addExercise = (ex: any) => {
    setExercises((prev) => [
      ...prev,
      {
        key: `${ex.id}-${Date.now()}`,
        exerciseId: ex.id,
        exerciseName: ex.name,
        targetSets: DEFAULT_TARGET_SETS,
        targetReps: DEFAULT_TARGET_REPS,
        restSeconds: DEFAULT_REST_SECONDS,
        notes: "",
      },
    ]);
    setShowExercisePicker(false);
    setExerciseSearch("");
    setSelectedCategory(null);
  };

  const removeExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const moveExercise = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= exercises.length) return;
    setExercises((prev) => {
      const copy = [...prev];
      [copy[index], copy[newIndex]] = [copy[newIndex], copy[index]];
      return copy;
    });
  };

  const updateExerciseField = (
    index: number,
    field: keyof PlanExerciseEntry,
    value: any
  ) => {
    setExercises((prev) =>
      prev.map((e, i) => (i === index ? { ...e, [field]: value } : e))
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a plan name");
      return;
    }
    if (exercises.length === 0) {
      Alert.alert("Error", "Please add at least one exercise");
      return;
    }

    const exerciseInputs = exercises.map((e, i) => ({
      exerciseId: e.exerciseId,
      sortOrder: i,
      targetSets: e.targetSets,
      targetReps: e.targetReps,
      restSeconds: e.restSeconds,
      notes: e.notes || undefined,
    }));

    if (isEditing) {
      updateMutation.mutate({
        id: editId!,
        name: name.trim(),
        exercises: exerciseInputs,
      });
    } else {
      createMutation.mutate({
        name: name.trim(),
        exercises: exerciseInputs,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Stack.Screen
        options={{ title: isEditing ? "Edit Plan" : "New Plan" }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Plan Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Push Day, Leg Day"
            placeholderTextColor={colors.textDisabled}
            maxLength={200}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exercises</Text>

          {exercises.map((ex, index) => (
            <AnimatedExerciseCard key={ex.key} style={styles.exerciseEntry}>
              <View style={styles.exerciseHeader}>
                <View style={styles.orderBadge}>
                  <Text style={styles.orderText}>{index + 1}</Text>
                </View>
                <Text style={styles.exerciseEntryName} numberOfLines={1}>
                  {ex.exerciseName}
                </Text>
                <View style={styles.exerciseActions}>
                  <Pressable
                    onPress={() => moveExercise(index, "up")}
                    style={styles.iconButton}
                    disabled={index === 0}
                  >
                    <Ionicons
                      name="chevron-up"
                      size={20}
                      color={index === 0 ? colors.textDisabled : colors.text}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => moveExercise(index, "down")}
                    style={styles.iconButton}
                    disabled={index === exercises.length - 1}
                  >
                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color={
                        index === exercises.length - 1
                          ? colors.textDisabled
                          : colors.text
                      }
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => removeExercise(index)}
                    style={styles.iconButton}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.configRow}>
                <NumberInput
                  label="Sets"
                  value={ex.targetSets}
                  onIncrement={() =>
                    updateExerciseField(index, "targetSets", ex.targetSets + 1)
                  }
                  onDecrement={() =>
                    updateExerciseField(index, "targetSets", ex.targetSets - 1)
                  }
                  min={1}
                />
                <NumberInput
                  label="Reps"
                  value={ex.targetReps}
                  onIncrement={() =>
                    updateExerciseField(index, "targetReps", ex.targetReps + 1)
                  }
                  onDecrement={() =>
                    updateExerciseField(index, "targetReps", ex.targetReps - 1)
                  }
                  min={1}
                />
                <NumberInput
                  label="Rest (s)"
                  value={ex.restSeconds}
                  onIncrement={() =>
                    updateExerciseField(
                      index,
                      "restSeconds",
                      ex.restSeconds + 15
                    )
                  }
                  onDecrement={() =>
                    updateExerciseField(
                      index,
                      "restSeconds",
                      ex.restSeconds - 15
                    )
                  }
                  min={0}
                />
              </View>
            </AnimatedExerciseCard>
          ))}

          <Button
            title="Add Exercise"
            onPress={() => setShowExercisePicker(true)}
            variant="ghost"
          />
        </View>

        <Button
          title={isEditing ? "Update Plan" : "Create Plan"}
          onPress={handleSave}
          size="large"
          loading={isPending}
          style={styles.saveButton}
        />

        <Modal
          visible={showExercisePicker}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setShowExercisePicker(false);
            setSelectedCategory(null);
          }}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => {
              setShowExercisePicker(false);
              setSelectedCategory(null);
            }}
          >
            <View
              style={styles.modalContent}
              onStartShouldSetResponder={() => true}
            >
              <Text style={styles.modalTitle}>Add Exercise</Text>
              <View style={styles.modalSearch}>
                <Ionicons
                  name="search"
                  size={18}
                  color={colors.textDisabled}
                />
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Search exercises..."
                  placeholderTextColor={colors.textDisabled}
                  value={exerciseSearch}
                  onChangeText={setExerciseSearch}
                  autoCorrect={false}
                />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                <Pressable
                  style={[
                    styles.chip,
                    selectedCategory === null && styles.chipActive,
                  ]}
                  onPress={() => setSelectedCategory(null)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedCategory === null && styles.chipTextActive,
                    ]}
                  >
                    All
                  </Text>
                </Pressable>
                {categories.map((cat: any) => (
                  <Pressable
                    key={cat.id}
                    style={[
                      styles.chip,
                      selectedCategory === cat.id && styles.chipActive,
                    ]}
                    onPress={() =>
                      setSelectedCategory(
                        selectedCategory === cat.id ? null : cat.id
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedCategory === cat.id && styles.chipTextActive,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <FlatList
                data={availableExercises}
                keyExtractor={(item: any) => item.id}
                renderItem={({ item }: { item: any }) => (
                  <Pressable
                    style={styles.modalItem}
                    onPress={() => addExercise(item)}
                  >
                    <Text style={styles.modalItemText}>{item.name}</Text>
                    <Text style={styles.modalItemSub}>
                      {item.categoryName ?? ""}
                    </Text>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No exercises found</Text>
                }
              />
            </View>
          </Pressable>
        </Modal>
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
  inputGroup: {
    gap: spacing.xs,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
    minHeight: 48,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  exerciseEntry: {
    gap: spacing.md,
  },
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  orderBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryVariant,
    justifyContent: "center",
    alignItems: "center",
  },
  orderText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  exerciseEntryName: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
    flex: 1,
  },
  exerciseActions: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  iconButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  configRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  saveButton: {
    marginTop: spacing.md,
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
    maxHeight: "70%",
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  modalSearch: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  modalSearchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 44,
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
  modalItemSub: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  emptyText: {
    ...typography.body,
    color: colors.textDisabled,
    textAlign: "center",
    padding: spacing.lg,
  },
  chipRow: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceVariant,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: "#000000",
  },
});

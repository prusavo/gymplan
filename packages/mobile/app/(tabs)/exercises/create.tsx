import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
  Modal,
  FlatList,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { colors, spacing, borderRadius, typography } from "../../../src/theme";
import { Button } from "../../../src/components/ui/Button";
import { trpc } from "../../../src/api/trpc";

export default function CreateExerciseScreen() {
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const isEditing = !!editId;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [categoryName, setCategoryName] = useState<string>("");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const utils = trpc.useUtils();
  const categoriesQuery = trpc.category.list.useQuery();
  const categories = categoriesQuery.data ?? [];

  const exerciseQuery = trpc.exercise.getById.useQuery(
    { id: editId! },
    { enabled: isEditing }
  );

  useEffect(() => {
    if (exerciseQuery.data) {
      const ex = exerciseQuery.data;
      setName(ex.name);
      setDescription(ex.description ?? "");
      setCategoryId(ex.categoryId ?? "");
      setCategoryName(ex.categoryName ?? "");
    }
  }, [exerciseQuery.data]);

  const createMutation = trpc.exercise.create.useMutation({
    onSuccess: () => {
      utils.exercise.list.invalidate();
      router.back();
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const updateMutation = trpc.exercise.update.useMutation({
    onSuccess: () => {
      utils.exercise.list.invalidate();
      utils.exercise.getById.invalidate({ id: editId! });
      router.back();
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter an exercise name");
      return;
    }
    if (!categoryId) {
      Alert.alert("Error", "Please select a category");
      return;
    }

    if (isEditing) {
      updateMutation.mutate({
        id: editId!,
        name: name.trim(),
        description: description.trim() || undefined,
        categoryId,
      });
    } else {
      createMutation.mutate({
        name: name.trim(),
        description: description.trim() || undefined,
        categoryId,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Stack.Screen
        options={{ title: isEditing ? "Edit Exercise" : "New Exercise" }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Exercise name"
            placeholderTextColor={colors.textDisabled}
            maxLength={200}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category</Text>
          <Pressable
            style={styles.input}
            onPress={() => setShowCategoryPicker(true)}
          >
            <Text
              style={[
                styles.pickerText,
                !categoryId && { color: colors.textDisabled },
              ]}
            >
              {categoryName || "Select a category"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the exercise..."
            placeholderTextColor={colors.textDisabled}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={2000}
          />
        </View>

        <Button
          title={isEditing ? "Update Exercise" : "Create Exercise"}
          onPress={handleSave}
          size="large"
          loading={isPending}
          style={styles.saveButton}
        />

        <Modal
          visible={showCategoryPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCategoryPicker(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowCategoryPicker(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <FlatList
                data={categories}
                keyExtractor={(item: any) => item.id}
                renderItem={({ item }: { item: any }) => (
                  <Pressable
                    style={[
                      styles.modalItem,
                      item.id === categoryId && styles.modalItemActive,
                    ]}
                    onPress={() => {
                      setCategoryId(item.id);
                      setCategoryName(item.name);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        item.id === categoryId && styles.modalItemTextActive,
                      ]}
                    >
                      {item.name.charAt(0).toUpperCase() + item.name.slice(1)}
                    </Text>
                  </Pressable>
                )}
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
    justifyContent: "center",
  },
  pickerText: {
    color: colors.text,
    fontSize: 16,
    textTransform: "capitalize",
  },
  textArea: {
    minHeight: 120,
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
    justifyContent: "center",
  },
  modalItemActive: {
    backgroundColor: colors.surfaceVariant,
  },
  modalItemText: {
    ...typography.body,
    color: colors.text,
  },
  modalItemTextActive: {
    color: colors.primary,
    fontWeight: "600",
  },
});

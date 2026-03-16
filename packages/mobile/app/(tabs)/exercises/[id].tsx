import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { colors, spacing, borderRadius, typography } from "../../../src/theme";
import { Button } from "../../../src/components/ui/Button";
import { Card } from "../../../src/components/ui/Card";
import { LoadingScreen } from "../../../src/components/ui/LoadingScreen";
import { trpc } from "../../../src/api/trpc";

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const utils = trpc.useUtils();

  const exerciseQuery = trpc.exercise.getById.useQuery({ id: id! });
  const deleteMutation = trpc.exercise.delete.useMutation({
    onSuccess: () => {
      utils.exercise.list.invalidate();
      router.back();
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  if (exerciseQuery.isLoading) {
    return <LoadingScreen />;
  }

  const exercise = exerciseQuery.data;
  if (!exercise) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Exercise not found</Text>
      </View>
    );
  }

  const handleDelete = () => {
    Alert.alert(
      "Delete Exercise",
      `Are you sure you want to delete "${exercise.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate({ id: exercise.id }),
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: exercise.name }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Card style={styles.infoCard}>
          <Text style={styles.name}>{exercise.name}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {exercise.categoryName ?? "Uncategorized"}
            </Text>
          </View>
          {exercise.description && (
            <Text style={styles.description}>{exercise.description}</Text>
          )}
        </Card>

        {exercise.images && exercise.images.length > 0 && (
          <View style={styles.imageSection}>
            <Text style={styles.sectionTitle}>Images</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {exercise.images.map((img: any) => (
                <Image
                  key={img.id}
                  source={{ uri: img.url }}
                  style={styles.image}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.actions}>
          <Button
            title="Edit Exercise"
            onPress={() =>
              router.push({
                pathname: "/(tabs)/exercises/create",
                params: { editId: exercise.id },
              })
            }
            variant="secondary"
          />
          <Button
            title="Delete Exercise"
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
  },
  infoCard: {
    gap: spacing.sm,
  },
  name: {
    ...typography.h2,
    color: colors.text,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primaryVariant,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xl,
  },
  categoryText: {
    ...typography.caption,
    color: "#FFFFFF",
    fontWeight: "600",
    textTransform: "capitalize",
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  imageSection: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
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

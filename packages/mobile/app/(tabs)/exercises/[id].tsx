import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { colors, spacing, borderRadius, typography } from "../../../src/theme";
import { Button } from "../../../src/components/ui/Button";
import { Card } from "../../../src/components/ui/Card";
import { LoadingScreen } from "../../../src/components/ui/LoadingScreen";
import { ErrorState } from "../../../src/components/ui/ErrorState";
import { useToast } from "../../../src/components/ui/Toast";
import { trpc } from "../../../src/api/trpc";

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const utils = trpc.useUtils();
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);

  const exerciseQuery = trpc.exercise.getById.useQuery({ id: id! });
  const deleteMutation = trpc.exercise.delete.useMutation({
    onSuccess: () => {
      utils.exercise.list.invalidate();
      showToast("Exercise deleted", "success");
      router.back();
    },
    onError: (err) => {
      showToast(err.message || "Failed to delete exercise", "error");
    },
  });

  const getUploadUrlMutation = trpc.exercise.getUploadUrl.useMutation();
  const saveImageMutation = trpc.exercise.saveImage.useMutation({
    onSuccess: () => {
      utils.exercise.getById.invalidate({ id: id! });
      showToast("Image uploaded", "success");
    },
    onError: (err) => {
      showToast(err.message || "Failed to save image", "error");
    },
  });

  const deleteImageMutation = trpc.exercise.deleteImage.useMutation({
    onSuccess: () => {
      utils.exercise.getById.invalidate({ id: id! });
      showToast("Image deleted", "success");
    },
    onError: (err) => {
      showToast(err.message || "Failed to delete image", "error");
    },
  });

  if (exerciseQuery.isLoading) {
    return <LoadingScreen />;
  }

  if (exerciseQuery.isError) {
    return (
      <View style={styles.container}>
        <ErrorState
          message={exerciseQuery.error?.message}
          onRetry={() => exerciseQuery.refetch()}
        />
      </View>
    );
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

  const handleAddImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission required", "Please allow access to your photo library.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const uri = asset.uri;
      const fileName = uri.split("/").pop() || "image.jpg";
      const extension = fileName.split(".").pop()?.toLowerCase();
      let contentType: "image/jpeg" | "image/png" | "image/webp" = "image/jpeg";
      if (extension === "png") contentType = "image/png";
      else if (extension === "webp") contentType = "image/webp";

      setUploading(true);

      // Get presigned upload URL
      const { uploadUrl, publicUrl } = await getUploadUrlMutation.mutateAsync({
        exerciseId: exercise.id,
        fileName,
        contentType,
      });

      // Upload to S3
      const response = await fetch(uri);
      const blob = await response.blob();
      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: blob,
      });

      // Save image record
      await saveImageMutation.mutateAsync({
        exerciseId: exercise.id,
        url: publicUrl,
      });
    } catch (err: any) {
      showToast(err.message || "Failed to upload image", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = (imageId: string) => {
    Alert.alert(
      "Delete Image",
      "Are you sure you want to delete this image?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteImageMutation.mutate({ imageId }),
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

        {/* Images section */}
        <View style={styles.imageSection}>
          <View style={styles.imageSectionHeader}>
            <Text style={styles.sectionTitle}>Images</Text>
            <Pressable
              style={styles.addImageButton}
              onPress={handleAddImage}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={18} color={colors.primary} />
                  <Text style={styles.addImageText}>Add Image</Text>
                </>
              )}
            </Pressable>
          </View>
          {exercise.images && exercise.images.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {exercise.images.map((img: any) => (
                <View key={img.id} style={styles.imageWrapper}>
                  <Image
                    source={{ uri: img.url }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                  <Pressable
                    style={styles.deleteImageButton}
                    onPress={() => handleDeleteImage(img.id)}
                  >
                    <Ionicons name="close-circle" size={24} color={colors.error} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.noImagesText}>No images yet</Text>
          )}
        </View>

        {/* History section */}
        <Button
          title="View History"
          onPress={() =>
            router.push({
              pathname: "/(tabs)/exercises/history",
              params: { exerciseId: exercise.id, exerciseName: exercise.name },
            })
          }
          variant="secondary"
        />

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
    paddingBottom: spacing.xl,
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
  imageSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  addImageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  addImageText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: "600",
  },
  imageWrapper: {
    position: "relative",
    marginRight: spacing.sm,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: borderRadius.md,
  },
  deleteImageButton: {
    position: "absolute",
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  noImagesText: {
    ...typography.bodySmall,
    color: colors.textDisabled,
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

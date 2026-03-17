import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography } from "../../../src/theme";
import { Card } from "../../../src/components/ui/Card";
import { LoadingScreen } from "../../../src/components/ui/LoadingScreen";
import { EmptyState } from "../../../src/components/ui/EmptyState";
import { ErrorState } from "../../../src/components/ui/ErrorState";
import { trpc } from "../../../src/api/trpc";

const PAGE_SIZE = 30;

const Separator = () => <View style={{ height: spacing.sm }} />;

export default function ExerciseListScreen() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const categoriesQuery = trpc.category.list.useQuery();

  const exercisesQuery = trpc.exercise.list.useInfiniteQuery(
    {
      search: debouncedSearch || undefined,
      categoryId: selectedCategory ?? undefined,
      limit: PAGE_SIZE,
    },
    {
      getNextPageParam: (lastPage, allPages) => {
        const loaded = allPages.reduce((sum, p) => sum + p.exercises.length, 0);
        return loaded < lastPage.total ? loaded : undefined;
      },
      initialCursor: 0,
    }
  );

  const categories = categoriesQuery.data ?? [];
  const exercises = exercisesQuery.data?.pages.flatMap((p) => p.exercises) ?? [];
  const { refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = exercisesQuery;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (exercisesQuery.isLoading && !exercisesQuery.data) {
    return <LoadingScreen />;
  }

  if (exercisesQuery.isError) {
    return (
      <View style={styles.container}>
        <ErrorState
          message={exercisesQuery.error?.message}
          onRetry={() => exercisesQuery.refetch()}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color={colors.textDisabled}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises..."
          placeholderTextColor={colors.textDisabled}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={20} color={colors.textDisabled} />
          </Pressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipContainer}
      >
        <Pressable
          onPress={() => setSelectedCategory(null)}
          style={[
            styles.chip,
            !selectedCategory && styles.chipActive,
          ]}
        >
          <Text
            style={[
              styles.chipText,
              !selectedCategory && styles.chipTextActive,
            ]}
          >
            All
          </Text>
        </Pressable>
        {categories.map((cat: any) => (
          <Pressable
            key={cat.id}
            onPress={() =>
              setSelectedCategory(
                selectedCategory === cat.id ? null : cat.id
              )
            }
            style={[
              styles.chip,
              selectedCategory === cat.id && styles.chipActive,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                selectedCategory === cat.id && styles.chipTextActive,
              ]}
            >
              {cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={exercises}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }: { item: any }) => (
          <Card
            onPress={() => router.push(`/(tabs)/exercises/${item.id}`)}
            style={styles.exerciseCard}
          >
            <Text style={styles.exerciseName}>{item.name}</Text>
            <Text style={styles.exerciseCategory}>
              {item.categoryName ?? "Uncategorized"}
            </Text>
          </Card>
        )}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={Separator}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator
              color={colors.primary}
              style={{ paddingVertical: spacing.md }}
            />
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="barbell-outline"
            title="No exercises found"
            message="Create your first exercise to get started"
            actionLabel="Create Exercise"
            onAction={() => router.push("/(tabs)/exercises/create")}
          />
        }
      />

      <Pressable
        style={styles.fab}
        onPress={() => router.push("/(tabs)/exercises/create")}
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 48,
  },
  chipScroll: {
    maxHeight: 56,
    marginTop: spacing.sm,
  },
  chipContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: "#000000",
    fontWeight: "600",
  },
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  exerciseCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  exerciseName: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
  },
  exerciseCategory: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: "capitalize",
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

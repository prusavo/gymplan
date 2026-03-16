# Exercise Library

The exercise library lets users create, browse, and manage their personal collection of exercises. Exercises are scoped per user, organized by categories, and support image attachments via S3 presigned uploads.

## Data Model

### Entity Relationships

```
category (1) <--- (*) exercise (1) ---> (*) exerciseImage
                        |
                   scoped to user
```

### Category

Global, shared across all users. Pre-seeded.

| Column      | Type         | Notes                    |
|-------------|--------------|--------------------------|
| `id`        | `uuid`       | PK, auto-generated       |
| `name`      | `varchar(50)`| Unique                   |
| `sortOrder` | `integer`    | Controls display ordering |

### Exercise

Per-user. Belongs to one category.

| Column       | Type          | Notes                          |
|--------------|---------------|--------------------------------|
| `id`         | `uuid`        | PK, auto-generated             |
| `userId`     | `uuid`        | FK to `app_user.id`            |
| `name`       | `varchar(200)`| Required                       |
| `description`| `text`        | Nullable                       |
| `categoryId` | `uuid`        | FK to `category.id`            |
| `createdAt`  | `timestamptz` | Default `now()`                |
| `updatedAt`  | `timestamptz` | Default `now()`                |

### ExerciseImage

Attached to an exercise. Cascade-deleted when the parent exercise is removed.

| Column       | Type          | Notes                          |
|--------------|---------------|--------------------------------|
| `id`         | `uuid`        | PK, auto-generated             |
| `exerciseId` | `uuid`        | FK to `exercise.id`, NOT NULL, cascade delete |
| `url`        | `varchar(500)`| Public S3 URL                  |
| `sortOrder`  | `integer`     | Controls display ordering      |
| `createdAt`  | `timestamptz` | Default `now()`                |

---

## API Reference

All exercise endpoints require authentication (`protectedProcedure`). Category list is public.

### `category.list` (query, public)

Returns all categories ordered by `sortOrder` ascending.

**Input**: None

**Output**: `Category[]`

```ts
const categories = trpc.category.list.useQuery();
```

---

### `exercise.list` (query, protected)

Paginated list of the authenticated user's exercises. Supports search and category filtering.

**Input** (`exerciseListQuerySchema`):

| Field        | Type     | Default | Description                      |
|--------------|----------|---------|----------------------------------|
| `categoryId` | `uuid?`  | --      | Filter by category               |
| `search`     | `string?`| --      | Case-insensitive name search (`ILIKE %term%`) |
| `limit`      | `int`    | `50`    | Page size (1-100)                |
| `cursor`     | `int`    | `0`     | Offset for pagination            |

**Output**:

```ts
{
  exercises: {
    id: string;
    userId: string;
    name: string;
    description: string | null;
    categoryId: string;
    categoryName: string | null;  // joined from category table
    createdAt: Date;
    updatedAt: Date;
  }[];
  total: number;  // total matching rows (for pagination math)
}
```

**Errors**: None specific -- returns empty array if no matches.

---

### `exercise.getById` (query, protected)

Returns a single exercise with its images. Ownership is enforced.

**Input**: `{ id: string }` (UUID)

**Output**: Exercise fields (same as list item) + `images: ExerciseImage[]` sorted by `sortOrder`.

**Errors**:

| Code        | When                                      |
|-------------|-------------------------------------------|
| `NOT_FOUND` | Exercise does not exist or belongs to another user |

```ts
const query = trpc.exercise.getById.useQuery({ id: exerciseId });
// query.data.images is available on the detail response
```

---

### `exercise.create` (mutation, protected)

**Input** (`createExerciseSchema`):

| Field         | Type     | Constraints          |
|---------------|----------|----------------------|
| `name`        | `string` | 1-200 chars, required|
| `description` | `string?`| Max 2000 chars       |
| `categoryId`  | `uuid`   | Required             |

**Output**: The created exercise row (without images or joined category name).

```ts
const mutation = trpc.exercise.create.useMutation({
  onSuccess: () => {
    utils.exercise.list.invalidate();
  },
});

mutation.mutate({
  name: "Bench Press",
  categoryId: "uuid-here",
  description: "Flat barbell bench press",
});
```

---

### `exercise.update` (mutation, protected)

Partial update. Only provided fields are changed. `updatedAt` is always set to `now()`.

**Input** (`updateExerciseSchema`):

| Field         | Type     | Constraints          |
|---------------|----------|----------------------|
| `id`          | `uuid`   | Required             |
| `name`        | `string?`| 1-200 chars          |
| `description` | `string?`| Max 2000 chars       |
| `categoryId`  | `uuid?`  |                      |

**Output**: The updated exercise row.

**Errors**:

| Code        | When                                      |
|-------------|-------------------------------------------|
| `NOT_FOUND` | Exercise does not exist or belongs to another user |

---

### `exercise.delete` (mutation, protected)

Deletes an exercise and its images (via cascade).

**Input**: `{ id: string }` (UUID)

**Output**: `{ success: true }`

**Errors**:

| Code        | When                                      |
|-------------|-------------------------------------------|
| `NOT_FOUND` | Exercise does not exist or belongs to another user |

```ts
const deleteMutation = trpc.exercise.delete.useMutation({
  onSuccess: () => {
    utils.exercise.list.invalidate();
    router.back();
  },
});

deleteMutation.mutate({ id: exerciseId });
```

---

### `exercise.getUploadUrl` (mutation, protected)

Generates a presigned S3 upload URL for attaching an image to an exercise.

**Input**:

| Field         | Type     | Description                |
|---------------|----------|----------------------------|
| `exerciseId`  | `uuid`   | Must be owned by the user  |
| `fileName`    | `string` | Alphanumeric with one extension (e.g. `photo.jpg`), max 255 chars, must match `/^[\w\-]+\.\w+$/` |
| `contentType` | `enum`   | `image/jpeg`, `image/png`, or `image/webp` |

**Output**:

```ts
{
  uploadUrl: string;   // PUT this URL with the file body
  publicUrl: string;   // URL to access the file after upload
  key: string;         // S3 object key: exercises/{userId}/{exerciseId}/{timestamp}-{fileName}
}
```

**Errors**:

| Code        | When                                      |
|-------------|-------------------------------------------|
| `NOT_FOUND` | Exercise does not exist or belongs to another user |

---

## Pagination

The exercise list uses **offset-based pagination** exposed through tRPC's `useInfiniteQuery`. Despite the parameter being named `cursor`, it is an integer offset -- not an opaque cursor.

### How It Works

1. The mobile client requests the first page with `cursor: 0` and `limit: 30`.
2. The server returns `{ exercises: [...], total: N }`.
3. `getNextPageParam` calculates the next offset by summing `exercises.length` across all loaded pages. If `loaded < total`, the next cursor is `loaded`; otherwise it returns `undefined` (no more pages).

### Client Implementation

```ts
const PAGE_SIZE = 30;

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

// Flatten all pages into a single array:
const exercises = exercisesQuery.data?.pages.flatMap((p) => p.exercises) ?? [];

// Trigger next page load when FlatList nears the end:
const handleEndReached = () => {
  if (exercisesQuery.hasNextPage && !exercisesQuery.isFetchingNextPage) {
    exercisesQuery.fetchNextPage();
  }
};
```

The `FlatList` calls `handleEndReached` via `onEndReached` with a `0.3` threshold, and renders an `ActivityIndicator` footer while `isFetchingNextPage` is true.

### Cache Invalidation

When exercises are created, updated, or deleted, the client calls `utils.exercise.list.invalidate()` to refetch all pages. For detail views, `utils.exercise.getById.invalidate({ id })` is also called after updates.

---

## Mobile Screens

### Exercise List (`/(tabs)/exercises/index.tsx`)

The main browsing screen. Features:

- **Search**: Text input with 300ms debounce. Clears with an X button.
- **Category filter**: Horizontal chip scroll. Tap a category to filter; tap again to deselect. "All" chip resets the filter.
- **Infinite scroll**: `FlatList` with offset-based pagination (30 items per page). Shows a spinner footer while loading more.
- **Pull-to-refresh**: `RefreshControl` that calls `exercisesQuery.refetch()`.
- **Empty state**: Shown when no exercises match. Includes a CTA to create the first exercise.
- **FAB**: Floating action button in the bottom-right corner navigates to the create screen.

Each exercise card displays the name and category, and navigates to the detail screen on tap.

### Create / Edit Exercise (`/(tabs)/exercises/create.tsx`)

Dual-purpose form screen. Behavior depends on whether an `editId` search param is present.

- **Fields**: Name (required, 200 char max), Category (required, modal picker), Description (optional, 2000 char max).
- **Edit mode**: When `editId` is set, the screen fetches the existing exercise via `getById` and pre-fills the form.
- **Validation**: Client-side checks for empty name and missing category before calling the mutation.
- **After save**: Invalidates the exercise list cache and navigates back.

### Exercise Detail (`/(tabs)/exercises/[id].tsx`)

Displays a single exercise with full details.

- **Info card**: Name, category badge, and description.
- **Image gallery**: Horizontal scroll of attached images (only shown if images exist). Images are 200x200, loaded from S3 URLs.
- **Edit button**: Navigates to the create screen with `editId` param.
- **Delete button**: Confirmation alert, then calls `exercise.delete`. Invalidates the list cache and navigates back.

---

## Zod Schemas

All validation schemas live in `packages/shared/src/schemas/exercise.ts` and are shared between the API and any client that imports `@gymplan/shared`.

| Export                    | Used by             |
|---------------------------|---------------------|
| `createExerciseSchema`    | `exercise.create`   |
| `updateExerciseSchema`    | `exercise.update`   |
| `exerciseListQuerySchema` | `exercise.list`     |
| `exerciseSchema`          | Type reference       |
| `exerciseImageSchema`     | Type reference       |

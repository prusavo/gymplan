# Plan Builder

The plan builder lets users create, browse, and manage workout plans. A plan is an ordered list of exercises with per-exercise configuration (sets, reps, rest). Plans are scoped per user, and their exercises cascade-delete when the plan is removed.

## Data Model

### Entity Relationships

```
appUser (1) <--- (*) gymPlan (1) <--- (*) gymPlanExercise ---> exercise
                                          |
                                     unique(gymPlanId, sortOrder)
```

### GymPlan

Per-user. Represents a reusable workout template.

| Column      | Type          | Notes                    |
|-------------|---------------|--------------------------|
| `id`        | `uuid`        | PK, auto-generated       |
| `userId`    | `uuid`        | FK to `app_user.id`      |
| `name`      | `varchar(200)`| Required                 |
| `createdAt` | `timestamptz` | Default `now()`          |
| `updatedAt` | `timestamptz` | Default `now()`          |

### GymPlanExercise

Belongs to a plan. References an exercise from the user's library. Cascade-deleted when the parent plan is removed.

| Column        | Type      | Notes                                          |
|---------------|-----------|-------------------------------------------------|
| `id`          | `uuid`    | PK, auto-generated                              |
| `gymPlanId`   | `uuid`    | FK to `gym_plan.id`, NOT NULL, cascade delete    |
| `exerciseId`  | `uuid`    | FK to `exercise.id`                              |
| `sortOrder`   | `integer` | Position in plan; unique per plan (`uq_plan_sort`) |
| `targetSets`  | `integer` | Default `3`                                      |
| `targetReps`  | `integer` | Default `10`                                     |
| `restSeconds` | `integer` | Default `90`                                     |
| `notes`       | `text`    | Nullable                                         |

---

## API Reference

All plan endpoints require authentication (`protectedProcedure`).

### `plan.list` (query, protected)

Returns all plans owned by the authenticated user, ordered by `createdAt` ascending. Each plan includes an `exerciseCount` derived from a correlated subquery.

**Input**: None

**Output**:

```ts
{
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  exerciseCount: number;  // count of gym_plan_exercise rows for this plan
}[]
```

```ts
const plansQuery = trpc.plan.list.useQuery();
```

---

### `plan.getById` (query, protected)

Returns a single plan with its exercises. Ownership is enforced (filters by both `id` and `userId`). Exercises are joined with the `exercise` and `category` tables to include names.

**Input**: `{ id: string }` (UUID)

**Output**:

```ts
{
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  exercises: {
    id: string;
    gymPlanId: string;
    exerciseId: string;
    sortOrder: number;
    targetSets: number;
    targetReps: number;
    restSeconds: number;
    notes: string | null;
    exerciseName: string | null;       // joined from exercise table
    exerciseDescription: string | null; // joined from exercise table
    categoryName: string | null;        // joined from category table
  }[];
}
```

Exercises are ordered by `sortOrder` ascending.

**Errors**:

| Code        | When                                      |
|-------------|-------------------------------------------|
| `NOT_FOUND` | Plan does not exist or belongs to another user |

```ts
const planQuery = trpc.plan.getById.useQuery({ id: planId });
// planQuery.data.exercises includes joined exercise/category names
```

---

### `plan.create` (mutation, protected)

Creates a plan and its exercises in a single transaction. Inserts the `gym_plan` row first, then bulk-inserts `gym_plan_exercise` rows using the returned plan ID.

**Input** (`createPlanSchema`):

| Field       | Type                     | Constraints               |
|-------------|--------------------------|---------------------------|
| `name`      | `string`                 | 1-200 chars, required     |
| `exercises` | `PlanExerciseInput[]`    | Min 1 item, required      |

Each exercise entry (`planExerciseInputSchema`):

| Field         | Type      | Default | Constraints          |
|---------------|-----------|---------|----------------------|
| `exerciseId`  | `uuid`    | --      | Required             |
| `sortOrder`   | `int`     | --      | Min 0, required      |
| `targetSets`  | `int`     | `3`     | 1-20                 |
| `targetReps`  | `int`     | `10`    | 1-100                |
| `restSeconds` | `int`     | `90`    | 0-600                |
| `notes`       | `string?` | --      | Max 500 chars        |

**Output**: The created `gym_plan` row (without exercises).

```ts
const createMutation = trpc.plan.create.useMutation({
  onSuccess: () => {
    utils.plan.list.invalidate();
  },
});

createMutation.mutate({
  name: "Push Day",
  exercises: [
    { exerciseId: "uuid-here", sortOrder: 0, targetSets: 4, targetReps: 8, restSeconds: 120 },
    { exerciseId: "uuid-here-2", sortOrder: 1 },  // uses defaults: 3 sets, 10 reps, 90s rest
  ],
});
```

---

### `plan.update` (mutation, protected)

Partial update. Checks ownership before modifying. `updatedAt` is always set to `now()`. If `exercises` is provided, all existing `gym_plan_exercise` rows are deleted and replaced (full replace, not merge).

**Input** (`updatePlanSchema`):

| Field       | Type                     | Constraints               |
|-------------|--------------------------|---------------------------|
| `id`        | `uuid`                   | Required                  |
| `name`      | `string?`                | 1-200 chars               |
| `exercises` | `PlanExerciseInput[]?`   | If provided, replaces all |

**Output**: The updated `gym_plan` row.

**Errors**:

| Code        | When                                      |
|-------------|-------------------------------------------|
| `NOT_FOUND` | Plan does not exist or belongs to another user |

---

### `plan.delete` (mutation, protected)

Deletes a plan and its exercises (via cascade). Checks ownership before deleting.

**Input**: `{ id: string }` (UUID)

**Output**: `{ success: true }`

**Errors**:

| Code        | When                                      |
|-------------|-------------------------------------------|
| `NOT_FOUND` | Plan does not exist or belongs to another user |

```ts
const deleteMutation = trpc.plan.delete.useMutation({
  onSuccess: () => {
    utils.plan.list.invalidate();
    router.back();
  },
});

deleteMutation.mutate({ id: planId });
```

---

## Mobile Screens

### Plan List (`/(tabs)/plans/index.tsx`)

The main browsing screen for plans. Features:

- **Plan cards**: Each card displays the plan name and exercise count (pluralized). Tapping navigates to the detail screen.
- **Empty state**: Shown when the user has no plans. Includes a CTA to create the first plan.
- **FAB**: Floating action button in the bottom-right corner navigates to the builder screen.

No pagination -- `plan.list` returns all plans for the user in a single query.

### Plan Detail (`/(tabs)/plans/[id].tsx`)

Displays a single plan with its full exercise list. Features:

- **Title and meta**: Plan name and exercise count.
- **Exercise cards**: Numbered badges, exercise name, configuration summary (`3 sets x 10 reps, 90s rest`), and optional notes.
- **Edit Order mode**: Toggle button appears when the plan has more than one exercise. Reveals up/down chevron buttons on each card for reordering (see [Optimistic Reorder](#optimistic-reorder) below). Toggling off clears optimistic state.
- **Start Workout**: Calls `workout.start` with the plan ID, populates the workout store, and navigates to the active workout screen.
- **Edit Plan**: Navigates to the builder screen with `editId` param.
- **Delete Plan**: Confirmation alert, then calls `plan.delete`. Invalidates the list cache and navigates back.

### Plan Builder (`/(tabs)/plans/builder.tsx`)

Dual-purpose form screen. Behavior depends on whether an `editId` search param is present.

- **Plan name**: Text input, 200 character max.
- **Exercise list**: Ordered cards, each showing a numbered badge, exercise name, and configuration controls.
- **Per-exercise config**: `NumberInput` steppers for Sets (min 1, step 1), Reps (min 1, step 1), and Rest in seconds (min 0, step 15).
- **Reorder**: Up/down chevron buttons on each exercise card. First item disables up; last item disables down.
- **Remove**: Trash icon button on each exercise card.
- **Add Exercise button**: Opens the exercise picker modal.
- **Edit mode**: When `editId` is set, fetches the existing plan via `getById` and pre-fills the form (name and exercises with their configuration).
- **Validation**: Client-side checks for empty name and zero exercises before calling the mutation.
- **After save**: Invalidates `plan.list` (and `plan.getById` in edit mode) and navigates back.
- **Long press animation**: Exercise cards scale up slightly and change background on long press (spring animation).

#### Exercise Picker Modal

A bottom-sheet modal for selecting exercises to add to the plan.

- **Search**: Text input that filters exercises by name (passed as `search` param to `exercise.list`).
- **Category filter chips**: Horizontal scroll of category chips. "All" chip resets the filter. Tapping an active chip deselects it.
- **Exercise list**: `FlatList` of matching exercises showing name and category. Tapping an exercise adds it to the plan with default configuration (3 sets, 10 reps, 90s rest), closes the modal, and resets search/filter state.
- **Empty state**: "No exercises found" text when no exercises match the search/filter.

---

## Optimistic Reorder

The plan detail screen uses optimistic updates for exercise reordering to keep the UI responsive while the server processes the change.

### How It Works

1. **User taps a move button** (up or down chevron) in Edit Order mode.
2. **Guard**: If `reorderMutation.isPending`, the move is blocked (prevents race conditions from rapid taps).
3. **Snapshot**: The current exercise list is saved to `previousOrderRef` for rollback.
4. **Optimistic update**: `optimisticExercises` state is set to the reordered array. The UI renders from `optimisticExercises ?? serverExercises`, so the change appears immediately.
5. **Mutation fires**: `plan.update` is called with the full exercise list and new `sortOrder` values.
6. **On success**: `plan.getById` cache is invalidated, `optimisticExercises` is cleared (UI falls back to fresh server data), and `previousOrderRef` is reset.
7. **On error**: `optimisticExercises` is rolled back to `previousOrderRef`, and an `Alert` is shown with the error message.

### Key Implementation Details

```ts
const [optimisticExercises, setOptimisticExercises] = useState<any[] | null>(null);
const previousOrderRef = useRef<any[] | null>(null);

// Display logic: optimistic state takes priority over server data
const exercises = optimisticExercises ?? serverExercises;

// Race condition guard
if (reorderMutation.isPending) return;
```

---

## Zod Schemas

All validation schemas live in `packages/shared/src/schemas/plan.ts` and are shared between the API and any client that imports `@gymplan/shared`.

| Export                    | Used by            |
|---------------------------|--------------------|
| `planExerciseInputSchema` | `plan.create`, `plan.update` (exercise entries) |
| `createPlanSchema`        | `plan.create`      |
| `updatePlanSchema`        | `plan.update`      |
| `planExerciseSchema`      | Type reference     |
| `planSchema`              | Type reference     |
| `PlanExerciseInput`       | TypeScript type    |
| `CreatePlanInput`         | TypeScript type    |
| `UpdatePlanInput`         | TypeScript type    |
| `PlanExercise`            | TypeScript type    |
| `Plan`                    | TypeScript type    |

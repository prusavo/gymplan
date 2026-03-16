# API Reference

GymPlan API uses tRPC over HTTP via Fastify. All procedures use Zod schemas from `@gymplan/shared` for input validation.

## Authentication

All endpoints except `auth.register` and `auth.login` require a valid JWT in the `Authorization` header:

```
Authorization: Bearer <token>
```

Tokens are issued on login/register and contain `{ id, email }`.

---

## auth Router

### auth.register

Create a new user account.

- **Type**: mutation
- **Auth**: none
- **Input**: `registerSchema`

| Field | Type | Validation |
|---|---|---|
| `email` | `string` | Valid email |
| `password` | `string` | 8-128 characters |
| `displayName` | `string` | 1-100 characters |

- **Returns**: `{ token: string, user: User }`

### auth.login

Authenticate with email and password.

- **Type**: mutation
- **Auth**: none
- **Input**: `loginSchema`

| Field | Type | Validation |
|---|---|---|
| `email` | `string` | Valid email |
| `password` | `string` | Any |

- **Returns**: `{ token: string, user: User }`
- **Errors**: 401 if credentials are invalid.

### auth.me

Get the currently authenticated user.

- **Type**: query
- **Auth**: required
- **Input**: none
- **Returns**: `User`

---

## category Router

### category.list

List all exercise categories.

- **Type**: query
- **Auth**: required
- **Input**: none
- **Returns**: `Category[]` -- sorted by `sortOrder`

Categories are system-defined: back, chest, triceps, biceps, shoulders, legs, abs, cardio.

---

## exercise Router

### exercise.list

List exercises for the current user with optional filters.

- **Type**: query
- **Auth**: required
- **Input**: `exerciseListQuerySchema`

| Field | Type | Default | Validation |
|---|---|---|---|
| `categoryId` | `string?` | -- | UUID, optional |
| `search` | `string?` | -- | Text search on name |
| `limit` | `number` | `50` | 1-100 |
| `offset` | `number` | `0` | >= 0 |

- **Returns**: `{ exercises: Exercise[], total: number }`

### exercise.getById

Get a single exercise with its images.

- **Type**: query
- **Auth**: required
- **Input**: `{ id: string }` (UUID)
- **Returns**: `Exercise & { images: ExerciseImage[] }`
- **Errors**: 404 if not found or not owned by user.

### exercise.create

Create a new exercise.

- **Type**: mutation
- **Auth**: required
- **Input**: `createExerciseSchema`

| Field | Type | Validation |
|---|---|---|
| `name` | `string` | 1-200 characters |
| `description` | `string?` | Max 2000 characters |
| `categoryId` | `string` | UUID, must exist |

- **Returns**: `Exercise`

### exercise.update

Update an existing exercise.

- **Type**: mutation
- **Auth**: required
- **Input**: `updateExerciseSchema`

| Field | Type | Validation |
|---|---|---|
| `id` | `string` | UUID |
| `name` | `string?` | 1-200 characters |
| `description` | `string?` | Max 2000 characters |
| `categoryId` | `string?` | UUID, must exist |

- **Returns**: `Exercise`
- **Errors**: 404 if not found or not owned by user.

### exercise.delete

Delete an exercise and its images.

- **Type**: mutation
- **Auth**: required
- **Input**: `{ id: string }` (UUID)
- **Returns**: `{ success: boolean }`
- **Errors**: 404 if not found or not owned by user.

### exercise.getUploadUrl

Generate a presigned S3 URL for uploading an exercise image.

- **Type**: mutation
- **Auth**: required
- **Input**: `{ exerciseId: string }` (UUID)
- **Returns**: `{ uploadUrl: string, imageUrl: string }`

The client uploads the image directly to `uploadUrl` via PUT, then the `imageUrl` is stored in `exercise_image`. Presigned URLs expire in 1 hour.

---

## plan Router

### plan.list

List workout plans for the current user.

- **Type**: query
- **Auth**: required
- **Input**: none
- **Returns**: `Plan[]`

### plan.getById

Get a plan with all its exercises and their details.

- **Type**: query
- **Auth**: required
- **Input**: `{ id: string }` (UUID)
- **Returns**: `Plan & { exercises: (PlanExercise & { exercise: Exercise })[] }`
- **Errors**: 404 if not found or not owned by user.

### plan.create

Create a new workout plan with exercises.

- **Type**: mutation
- **Auth**: required
- **Input**: `createPlanSchema`

| Field | Type | Validation |
|---|---|---|
| `name` | `string` | 1-200 characters |
| `exercises` | `PlanExerciseInput[]` | At least 1 exercise |

Each exercise in the array:

| Field | Type | Default | Validation |
|---|---|---|---|
| `exerciseId` | `string` | -- | UUID |
| `sortOrder` | `number` | -- | >= 0 |
| `targetSets` | `number` | `3` | 1-20 |
| `targetReps` | `number` | `10` | 1-100 |
| `restSeconds` | `number` | `90` | 0-600 |
| `notes` | `string?` | -- | Max 500 characters |

- **Returns**: `Plan`

### plan.update

Update a plan's name and/or exercises.

- **Type**: mutation
- **Auth**: required
- **Input**: `updatePlanSchema`

| Field | Type | Validation |
|---|---|---|
| `id` | `string` | UUID |
| `name` | `string?` | 1-200 characters |
| `exercises` | `PlanExerciseInput[]?` | Replaces all exercises if provided |

- **Returns**: `Plan`
- **Errors**: 404 if not found or not owned by user.

### plan.delete

Delete a plan and all its exercises.

- **Type**: mutation
- **Auth**: required
- **Input**: `{ id: string }` (UUID)
- **Returns**: `{ success: boolean }`

---

## workout Router

### workout.start

Start a new workout session from a plan.

- **Type**: mutation
- **Auth**: required
- **Input**: `startWorkoutSchema`

| Field | Type | Validation |
|---|---|---|
| `gymPlanId` | `string` | UUID |

- **Returns**: `GymPlanInstance`
- **Errors**: 400 if user already has an `in_progress` workout.

### workout.logSet

Record a completed set during a workout.

- **Type**: mutation
- **Auth**: required
- **Input**: `logSetSchema`

| Field | Type | Validation |
|---|---|---|
| `instanceId` | `string` | UUID |
| `gymPlanExerciseId` | `string` | UUID |
| `setNumber` | `number` | >= 1 |
| `weightKg` | `number?` | 0-1000, nullable for bodyweight |
| `repsCompleted` | `number` | 0-999 |
| `notes` | `string?` | Max 500 characters |

- **Returns**: `InstanceSet`
- **Errors**: 400 if instance is not `in_progress`.

### workout.skipSet

Mark a set as skipped.

- **Type**: mutation
- **Auth**: required
- **Input**: `skipSetSchema`

| Field | Type | Validation |
|---|---|---|
| `instanceId` | `string` | UUID |
| `gymPlanExerciseId` | `string` | UUID |
| `setNumber` | `number` | >= 1 |

- **Returns**: `InstanceSet` (with `skipped: true`, `repsCompleted: 0`)

### workout.complete

Finish a workout successfully.

- **Type**: mutation
- **Auth**: required
- **Input**: `completeWorkoutSchema`

| Field | Type | Validation |
|---|---|---|
| `instanceId` | `string` | UUID |
| `notes` | `string?` | Max 2000 characters |

- **Returns**: `GymPlanInstance` (with `status: "completed"`)

### workout.abandon

Abandon an in-progress workout. All logged sets are preserved.

- **Type**: mutation
- **Auth**: required
- **Input**: `abandonWorkoutSchema`

| Field | Type | Validation |
|---|---|---|
| `instanceId` | `string` | UUID |
| `notes` | `string?` | Max 2000 characters |

- **Returns**: `GymPlanInstance` (with `status: "abandoned"`)

### workout.getActive

Get the current user's active (in_progress) workout, if any.

- **Type**: query
- **Auth**: required
- **Input**: none
- **Returns**: `GymPlanInstance | null`

---

## progress Router

### progress.instanceHistory

List completed and abandoned workout sessions.

- **Type**: query
- **Auth**: required
- **Input**: `instanceHistoryQuerySchema`

| Field | Type | Default | Validation |
|---|---|---|---|
| `limit` | `number` | `20` | 1-100 |
| `offset` | `number` | `0` | >= 0 |

- **Returns**: `{ instances: GymPlanInstance[], total: number }`

### progress.exerciseHistory

Get set history for a specific exercise across all workouts.

- **Type**: query
- **Auth**: required
- **Input**: `exerciseHistoryQuerySchema`

| Field | Type | Default | Validation |
|---|---|---|---|
| `exerciseId` | `string` | -- | UUID |
| `limit` | `number` | `20` | 1-100 |
| `offset` | `number` | `0` | >= 0 |

- **Returns**: `{ sets: InstanceSet[], total: number }`

### progress.personalRecords

Get personal bests for all exercises the user has logged.

- **Type**: query
- **Auth**: required
- **Input**: none
- **Returns**: `PersonalRecord[]`

Each record contains:

| Field | Type | Notes |
|---|---|---|
| `exerciseId` | `string` | UUID |
| `exerciseName` | `string` | |
| `maxWeight` | `number?` | Null if all sets were bodyweight |
| `maxReps` | `number` | Best single-set reps |
| `maxVolume` | `number?` | Best weight x reps in a single set |
| `achievedAt` | `string` | ISO datetime of the record-setting set |

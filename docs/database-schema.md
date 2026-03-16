# Database Schema

GymPlan uses PostgreSQL 16 with Drizzle ORM. The schema is defined in `packages/api/src/db/schema.ts`.

## Entity Relationship Overview

```
app_user
  |
  +--< exercise (userId)
  |      |
  |      +--< exercise_image (exerciseId, CASCADE delete)
  |
  +--< gym_plan (userId)
  |      |
  |      +--< gym_plan_exercise (gymPlanId, CASCADE delete)
  |             |
  |             +--- exercise (exerciseId)
  |
  +--< gym_plan_instance (userId)
         |
         +--- gym_plan (gymPlanId)
         |
         +--< instance_set (gymPlanInstanceId, CASCADE delete)
                |
                +--- gym_plan_exercise (gymPlanExerciseId)
```

## Tables

### app_user

Registered users.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default random | |
| `email` | `varchar(255)` | UNIQUE, NOT NULL | Login identifier |
| `password_hash` | `varchar(255)` | NOT NULL | bcrypt hash (cost 12) |
| `display_name` | `varchar(100)` | NOT NULL | |
| `created_at` | `timestamptz` | default now() | |

Named `app_user` instead of `user` to avoid the PostgreSQL reserved word.

### category

System-defined muscle group categories. Seeded at startup, not user-editable.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default random | |
| `name` | `varchar(50)` | UNIQUE, NOT NULL | e.g. "chest", "back" |
| `sort_order` | `integer` | NOT NULL | Display ordering |

**Seed values**: back, chest, triceps, biceps, shoulders, legs, abs, cardio.

### exercise

User-created exercises.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default random | |
| `user_id` | `uuid` | FK -> app_user.id | Owner |
| `name` | `varchar(200)` | NOT NULL | |
| `description` | `text` | nullable | |
| `category_id` | `uuid` | FK -> category.id | Muscle group |
| `created_at` | `timestamptz` | default now() | |
| `updated_at` | `timestamptz` | default now() | |

### exercise_image

Images attached to exercises. Stored in S3, URL recorded here.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default random | |
| `exercise_id` | `uuid` | FK -> exercise.id, CASCADE, NOT NULL | |
| `url` | `varchar(500)` | NOT NULL | S3 object URL |
| `sort_order` | `integer` | NOT NULL | Display ordering |
| `created_at` | `timestamptz` | default now() | |

Deleting an exercise cascades to delete its image records.

### gym_plan

Reusable workout plans.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default random | |
| `user_id` | `uuid` | FK -> app_user.id | Owner |
| `name` | `varchar(200)` | NOT NULL | |
| `created_at` | `timestamptz` | default now() | |
| `updated_at` | `timestamptz` | default now() | |

### gym_plan_exercise

Exercises within a plan, with per-plan configuration.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default random | |
| `gym_plan_id` | `uuid` | FK -> gym_plan.id, CASCADE, NOT NULL | |
| `exercise_id` | `uuid` | FK -> exercise.id | |
| `sort_order` | `integer` | | Position in plan |
| `target_sets` | `integer` | default 3 | |
| `target_reps` | `integer` | default 10 | |
| `rest_seconds` | `integer` | default 90 | Seconds between sets |
| `notes` | `text` | nullable | e.g. "pause at bottom" |

**Unique constraint**: `(gym_plan_id, sort_order)` -- prevents duplicate ordering within a plan.

### gym_plan_instance

A single execution of a plan (one workout session).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default random | |
| `gym_plan_id` | `uuid` | FK -> gym_plan.id | Which plan was executed |
| `user_id` | `uuid` | FK -> app_user.id | |
| `status` | `varchar(20)` | NOT NULL, CHECK | `in_progress`, `completed`, or `abandoned` |
| `started_at` | `timestamptz` | default now() | |
| `completed_at` | `timestamptz` | nullable | Set when completed/abandoned |
| `notes` | `text` | nullable | Post-workout notes |

**CHECK constraint**: `status IN ('in_progress', 'completed', 'abandoned')`.

### instance_set

Individual sets logged during a workout instance.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default random | |
| `gym_plan_instance_id` | `uuid` | FK -> gym_plan_instance.id, CASCADE, NOT NULL | |
| `gym_plan_exercise_id` | `uuid` | FK -> gym_plan_exercise.id | |
| `set_number` | `integer` | NOT NULL | 1-based within exercise |
| `weight_kg` | `numeric(6,2)` | nullable | Null for bodyweight exercises |
| `reps_completed` | `integer` | NOT NULL | Actual reps performed |
| `completed_at` | `timestamptz` | default now() | |
| `skipped` | `boolean` | default false | |
| `notes` | `text` | nullable | |

**Unique constraint**: `(gym_plan_instance_id, gym_plan_exercise_id, set_number)` -- one record per set per exercise per session.

## Key Design Decisions

### instance_set references gym_plan_exercise, not exercise

Sets reference `gym_plan_exercise_id` rather than `exercise_id` directly. This preserves the full context of the workout: which plan was used, what the target sets/reps were, and the exercise ordering at the time of execution. If a plan is later modified, historical workout data remains accurate.

### Nullable weight_kg for bodyweight exercises

`weight_kg` is nullable on `instance_set` (and nullable/optional on the input schema). Bodyweight exercises like pull-ups or dips do not require a weight value. The app should display these differently from weighted exercises.

### CHECK constraint on status

The `gym_plan_instance.status` column uses a database-level CHECK constraint rather than a PostgreSQL enum. This is easier to extend (adding a new status does not require an ALTER TYPE migration) while still providing data integrity.

### CASCADE deletes

- Deleting an exercise cascades to `exercise_image`.
- Deleting a plan cascades to `gym_plan_exercise`.
- Deleting a workout instance cascades to `instance_set`.

Plans and instances reference exercises/plans with simple FK (no cascade), so deleting an exercise does not destroy historical workout data.

### UUIDs everywhere

All primary keys are `uuid` with `defaultRandom()`. This avoids sequential ID enumeration, simplifies client-side optimistic creation, and works well in distributed scenarios.

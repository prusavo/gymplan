import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const appUser = pgTable("app_user", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const category = pgTable("category", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 50 }).unique().notNull(),
  sortOrder: integer("sort_order").notNull(),
});

export const exercise = pgTable("exercise", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => appUser.id),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  categoryId: uuid("category_id").references(() => category.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const exerciseImage = pgTable("exercise_image", {
  id: uuid("id").primaryKey().defaultRandom(),
  exerciseId: uuid("exercise_id")
    .references(() => exercise.id, { onDelete: "cascade" })
    .notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  sortOrder: integer("sort_order").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const gymPlan = pgTable("gym_plan", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => appUser.id),
  name: varchar("name", { length: 200 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const gymPlanExercise = pgTable(
  "gym_plan_exercise",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gymPlanId: uuid("gym_plan_id")
      .references(() => gymPlan.id, { onDelete: "cascade" })
      .notNull(),
    exerciseId: uuid("exercise_id").references(() => exercise.id),
    sortOrder: integer("sort_order"),
    targetSets: integer("target_sets").default(3),
    targetReps: integer("target_reps").default(10),
    restSeconds: integer("rest_seconds").default(90),
    notes: text("notes"),
  },
  (table) => [unique("uq_plan_sort").on(table.gymPlanId, table.sortOrder)]
);

export const gymPlanInstance = pgTable(
  "gym_plan_instance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gymPlanId: uuid("gym_plan_id").references(() => gymPlan.id),
    userId: uuid("user_id").references(() => appUser.id),
    status: varchar("status", { length: 20 }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    notes: text("notes"),
  },
  (table) => [
    check(
      "status_check",
      sql`${table.status} IN ('in_progress', 'completed', 'abandoned')`
    ),
  ]
);

export const instanceSet = pgTable(
  "instance_set",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gymPlanInstanceId: uuid("gym_plan_instance_id")
      .references(() => gymPlanInstance.id, { onDelete: "cascade" })
      .notNull(),
    gymPlanExerciseId: uuid("gym_plan_exercise_id").references(
      () => gymPlanExercise.id
    ),
    setNumber: integer("set_number").notNull(),
    weightKg: numeric("weight_kg", { precision: 6, scale: 2 }),
    repsCompleted: integer("reps_completed").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow(),
    skipped: boolean("skipped").default(false),
    notes: text("notes"),
  },
  (table) => [
    unique("uq_instance_exercise_set").on(
      table.gymPlanInstanceId,
      table.gymPlanExerciseId,
      table.setNumber
    ),
  ]
);

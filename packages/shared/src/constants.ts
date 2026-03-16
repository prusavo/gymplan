export const CATEGORIES = [
  "back",
  "chest",
  "triceps",
  "biceps",
  "shoulders",
  "legs",
  "abs",
  "cardio",
] as const;

export type CategoryName = (typeof CATEGORIES)[number];

export const WORKOUT_STATUS = ["in_progress", "completed", "abandoned"] as const;
export type WorkoutStatus = (typeof WORKOUT_STATUS)[number];

export const DEFAULT_REST_SECONDS = 90;
export const DEFAULT_TARGET_SETS = 3;
export const DEFAULT_TARGET_REPS = 10;

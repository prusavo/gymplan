import { z } from "zod";
import { WORKOUT_STATUS } from "../constants.js";

export const startWorkoutSchema = z.object({
  gymPlanId: z.string().uuid(),
});

export const logSetSchema = z.object({
  instanceId: z.string().uuid(),
  gymPlanExerciseId: z.string().uuid(),
  setNumber: z.number().int().min(1),
  weightKg: z.number().min(0).max(1000).nullable().optional(),
  repsCompleted: z.number().int().min(0).max(999),
  notes: z.string().max(500).optional(),
});

export const skipSetSchema = z.object({
  instanceId: z.string().uuid(),
  gymPlanExerciseId: z.string().uuid(),
  setNumber: z.number().int().min(1),
});

export const completeWorkoutSchema = z.object({
  instanceId: z.string().uuid(),
  notes: z.string().max(2000).optional(),
});

export const abandonWorkoutSchema = z.object({
  instanceId: z.string().uuid(),
  notes: z.string().max(2000).optional(),
});

export const instanceSetSchema = z.object({
  id: z.string().uuid(),
  gymPlanInstanceId: z.string().uuid(),
  gymPlanExerciseId: z.string().uuid(),
  setNumber: z.number().int(),
  weightKg: z.number().nullable(),
  repsCompleted: z.number().int(),
  completedAt: z.string().datetime(),
  skipped: z.boolean(),
  notes: z.string().nullable(),
});

export const gymPlanInstanceSchema = z.object({
  id: z.string().uuid(),
  gymPlanId: z.string().uuid(),
  userId: z.string().uuid(),
  status: z.enum(WORKOUT_STATUS),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  notes: z.string().nullable(),
});

export type StartWorkoutInput = z.infer<typeof startWorkoutSchema>;
export type LogSetInput = z.infer<typeof logSetSchema>;
export type SkipSetInput = z.infer<typeof skipSetSchema>;
export type CompleteWorkoutInput = z.infer<typeof completeWorkoutSchema>;
export type AbandonWorkoutInput = z.infer<typeof abandonWorkoutSchema>;
export type InstanceSet = z.infer<typeof instanceSetSchema>;
export type GymPlanInstance = z.infer<typeof gymPlanInstanceSchema>;

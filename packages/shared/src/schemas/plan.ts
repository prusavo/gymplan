import { z } from "zod";
import { DEFAULT_REST_SECONDS, DEFAULT_TARGET_REPS, DEFAULT_TARGET_SETS } from "../constants.js";

export const planExerciseInputSchema = z.object({
  exerciseId: z.string().uuid(),
  sortOrder: z.number().int().min(0),
  targetSets: z.number().int().min(1).max(20).default(DEFAULT_TARGET_SETS),
  targetReps: z.number().int().min(1).max(100).default(DEFAULT_TARGET_REPS),
  restSeconds: z.number().int().min(0).max(600).default(DEFAULT_REST_SECONDS),
  notes: z.string().max(500).optional(),
});

export const createPlanSchema = z.object({
  name: z.string().min(1).max(200),
  exercises: z.array(planExerciseInputSchema).min(1),
});

export const updatePlanSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  exercises: z.array(planExerciseInputSchema).optional(),
});

export const planExerciseSchema = z.object({
  id: z.string().uuid(),
  gymPlanId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  sortOrder: z.number().int(),
  targetSets: z.number().int(),
  targetReps: z.number().int(),
  restSeconds: z.number().int(),
  notes: z.string().nullable(),
});

export const planSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type PlanExerciseInput = z.infer<typeof planExerciseInputSchema>;
export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type PlanExercise = z.infer<typeof planExerciseSchema>;
export type Plan = z.infer<typeof planSchema>;

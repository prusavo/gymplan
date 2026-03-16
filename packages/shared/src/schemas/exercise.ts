import { z } from "zod";

export const createExerciseSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  categoryId: z.string().uuid(),
});

export const updateExerciseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  categoryId: z.string().uuid().optional(),
});

export const exerciseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  categoryId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const exerciseImageSchema = z.object({
  id: z.string().uuid(),
  exerciseId: z.string().uuid(),
  url: z.string().url(),
  sortOrder: z.number().int(),
  createdAt: z.string().datetime(),
});

export const exerciseListQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type UpdateExerciseInput = z.infer<typeof updateExerciseSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
export type ExerciseImage = z.infer<typeof exerciseImageSchema>;
export type ExerciseListQuery = z.infer<typeof exerciseListQuerySchema>;

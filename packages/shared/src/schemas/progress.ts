import { z } from "zod";

export const instanceHistoryQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export const exerciseHistoryQuerySchema = z.object({
  exerciseId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export const personalRecordSchema = z.object({
  exerciseId: z.string().uuid(),
  exerciseName: z.string(),
  maxWeight: z.number().nullable(),
  maxReps: z.number().int(),
  maxVolume: z.number().nullable(),
  achievedAt: z.string().datetime(),
});

export type InstanceHistoryQuery = z.infer<typeof instanceHistoryQuerySchema>;
export type ExerciseHistoryQuery = z.infer<typeof exerciseHistoryQuerySchema>;
export type PersonalRecord = z.infer<typeof personalRecordSchema>;

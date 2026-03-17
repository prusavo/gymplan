import { eq, and, sql, desc, inArray } from "drizzle-orm";
import {
  instanceHistoryQuerySchema,
  exerciseHistoryQuerySchema,
} from "@gymplan/shared";
import { router, protectedProcedure } from "../middleware/auth.js";
import {
  gymPlanInstance,
  instanceSet,
  gymPlanExercise,
  exercise,
  gymPlan,
} from "../db/schema.js";

export const progressRouter = router({
  instanceHistory: protectedProcedure
    .input(instanceHistoryQuerySchema)
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: gymPlanInstance.id,
          gymPlanId: gymPlanInstance.gymPlanId,
          status: gymPlanInstance.status,
          startedAt: gymPlanInstance.startedAt,
          completedAt: gymPlanInstance.completedAt,
          notes: gymPlanInstance.notes,
          planName: gymPlan.name,
        })
        .from(gymPlanInstance)
        .leftJoin(gymPlan, eq(gymPlanInstance.gymPlanId, gymPlan.id))
        .where(
          and(
            eq(gymPlanInstance.userId, ctx.user.id),
            inArray(gymPlanInstance.status, ["completed", "abandoned"])
          )
        )
        .orderBy(desc(gymPlanInstance.completedAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  exerciseHistory: protectedProcedure
    .input(exerciseHistoryQuerySchema)
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: instanceSet.id,
          setNumber: instanceSet.setNumber,
          weightKg: instanceSet.weightKg,
          repsCompleted: instanceSet.repsCompleted,
          completedAt: instanceSet.completedAt,
          skipped: instanceSet.skipped,
          notes: instanceSet.notes,
          instanceId: gymPlanInstance.id,
          instanceStartedAt: gymPlanInstance.startedAt,
        })
        .from(instanceSet)
        .innerJoin(
          gymPlanExercise,
          eq(instanceSet.gymPlanExerciseId, gymPlanExercise.id)
        )
        .innerJoin(
          gymPlanInstance,
          eq(instanceSet.gymPlanInstanceId, gymPlanInstance.id)
        )
        .where(
          and(
            eq(gymPlanExercise.exerciseId, input.exerciseId),
            eq(gymPlanInstance.userId, ctx.user.id)
          )
        )
        .orderBy(desc(instanceSet.completedAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  personalRecords: protectedProcedure.query(async ({ ctx }) => {
    const records = await ctx.db
      .select({
        exerciseId: gymPlanExercise.exerciseId,
        exerciseName: exercise.name,
        maxWeight: sql<string | null>`MAX(${instanceSet.weightKg})`.as(
          "max_weight"
        ),
        maxReps: sql<number>`MAX(${instanceSet.repsCompleted})`.as("max_reps"),
        maxVolume:
          sql<string | null>`MAX(CAST(${instanceSet.weightKg} AS NUMERIC) * ${instanceSet.repsCompleted})`.as(
            "max_volume"
          ),
        achievedAt: sql<string>`MAX(${instanceSet.completedAt})`.as(
          "achieved_at"
        ),
      })
      .from(instanceSet)
      .innerJoin(
        gymPlanExercise,
        eq(instanceSet.gymPlanExerciseId, gymPlanExercise.id)
      )
      .innerJoin(exercise, eq(gymPlanExercise.exerciseId, exercise.id))
      .innerJoin(
        gymPlanInstance,
        eq(instanceSet.gymPlanInstanceId, gymPlanInstance.id)
      )
      .where(
        and(
          eq(gymPlanInstance.userId, ctx.user.id),
          eq(instanceSet.skipped, false)
        )
      )
      .groupBy(gymPlanExercise.exerciseId, exercise.name);

    return records.map((r) => ({
      exerciseId: r.exerciseId,
      exerciseName: r.exerciseName,
      maxWeight: r.maxWeight ? Number(r.maxWeight) : null,
      maxReps: r.maxReps,
      maxVolume: r.maxVolume ? Number(r.maxVolume) : null,
      achievedAt: r.achievedAt,
    }));
  }),
});

import { TRPCError } from "@trpc/server";
import { eq, and, sql } from "drizzle-orm";
import {
  startWorkoutSchema,
  logSetSchema,
  skipSetSchema,
  completeWorkoutSchema,
  abandonWorkoutSchema,
} from "@gymplan/shared";
import { router, protectedProcedure } from "../middleware/auth.js";
import {
  gymPlanInstance,
  instanceSet,
  gymPlanExercise,
  exercise,
  gymPlan,
} from "../db/schema.js";

export const workoutRouter = router({
  start: protectedProcedure
    .input(startWorkoutSchema)
    .mutation(async ({ ctx, input }) => {
      // Reject if user already has an active workout
      const [existing] = await ctx.db
        .select({ id: gymPlanInstance.id })
        .from(gymPlanInstance)
        .where(
          and(
            eq(gymPlanInstance.userId, ctx.user.id),
            eq(gymPlanInstance.status, "in_progress")
          )
        )
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "You already have an active workout. Complete or abandon it before starting a new one.",
        });
      }

      // Verify the plan exists and belongs to the user
      const [plan] = await ctx.db
        .select({ id: gymPlan.id })
        .from(gymPlan)
        .where(
          and(
            eq(gymPlan.id, input.gymPlanId),
            eq(gymPlan.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!plan) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Gym plan not found",
        });
      }

      const [instance] = await ctx.db
        .insert(gymPlanInstance)
        .values({
          gymPlanId: input.gymPlanId,
          userId: ctx.user.id,
          status: "in_progress",
        })
        .returning();

      return instance;
    }),

  logSet: protectedProcedure
    .input(logSetSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify the instance belongs to the user
      const [instance] = await ctx.db
        .select()
        .from(gymPlanInstance)
        .where(
          and(
            eq(gymPlanInstance.id, input.instanceId),
            eq(gymPlanInstance.userId, ctx.user.id),
            eq(gymPlanInstance.status, "in_progress")
          )
        )
        .limit(1);

      if (!instance) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Active workout instance not found",
        });
      }

      const [result] = await ctx.db
        .insert(instanceSet)
        .values({
          gymPlanInstanceId: input.instanceId,
          gymPlanExerciseId: input.gymPlanExerciseId,
          setNumber: input.setNumber,
          weightKg: input.weightKg != null ? String(input.weightKg) : null,
          repsCompleted: input.repsCompleted,
          notes: input.notes ?? null,
          skipped: false,
        })
        .onConflictDoUpdate({
          target: [
            instanceSet.gymPlanInstanceId,
            instanceSet.gymPlanExerciseId,
            instanceSet.setNumber,
          ],
          set: {
            weightKg: input.weightKg != null ? String(input.weightKg) : null,
            repsCompleted: input.repsCompleted,
            notes: input.notes ?? null,
            skipped: false,
            completedAt: new Date(),
          },
        })
        .returning();

      return result;
    }),

  skipSet: protectedProcedure
    .input(skipSetSchema)
    .mutation(async ({ ctx, input }) => {
      const [instance] = await ctx.db
        .select()
        .from(gymPlanInstance)
        .where(
          and(
            eq(gymPlanInstance.id, input.instanceId),
            eq(gymPlanInstance.userId, ctx.user.id),
            eq(gymPlanInstance.status, "in_progress")
          )
        )
        .limit(1);

      if (!instance) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Active workout instance not found",
        });
      }

      const [result] = await ctx.db
        .insert(instanceSet)
        .values({
          gymPlanInstanceId: input.instanceId,
          gymPlanExerciseId: input.gymPlanExerciseId,
          setNumber: input.setNumber,
          weightKg: null,
          repsCompleted: 0,
          skipped: true,
        })
        .onConflictDoUpdate({
          target: [
            instanceSet.gymPlanInstanceId,
            instanceSet.gymPlanExerciseId,
            instanceSet.setNumber,
          ],
          set: {
            skipped: true,
            repsCompleted: 0,
            weightKg: null,
            completedAt: new Date(),
          },
        })
        .returning();

      return result;
    }),

  complete: protectedProcedure
    .input(completeWorkoutSchema)
    .mutation(async ({ ctx, input }) => {
      const [instance] = await ctx.db
        .select()
        .from(gymPlanInstance)
        .where(
          and(
            eq(gymPlanInstance.id, input.instanceId),
            eq(gymPlanInstance.userId, ctx.user.id),
            eq(gymPlanInstance.status, "in_progress")
          )
        )
        .limit(1);

      if (!instance) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Active workout instance not found",
        });
      }

      const [updated] = await ctx.db
        .update(gymPlanInstance)
        .set({
          status: "completed",
          completedAt: new Date(),
          notes: input.notes ?? instance.notes,
        })
        .where(eq(gymPlanInstance.id, input.instanceId))
        .returning();

      return updated;
    }),

  abandon: protectedProcedure
    .input(abandonWorkoutSchema)
    .mutation(async ({ ctx, input }) => {
      const [instance] = await ctx.db
        .select()
        .from(gymPlanInstance)
        .where(
          and(
            eq(gymPlanInstance.id, input.instanceId),
            eq(gymPlanInstance.userId, ctx.user.id),
            eq(gymPlanInstance.status, "in_progress")
          )
        )
        .limit(1);

      if (!instance) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Active workout instance not found",
        });
      }

      const [updated] = await ctx.db
        .update(gymPlanInstance)
        .set({
          status: "abandoned",
          completedAt: new Date(),
          notes: input.notes ?? instance.notes,
        })
        .where(eq(gymPlanInstance.id, input.instanceId))
        .returning();

      return updated;
    }),

  getActive: protectedProcedure.query(async ({ ctx }) => {
    const [instance] = await ctx.db
      .select({
        id: gymPlanInstance.id,
        gymPlanId: gymPlanInstance.gymPlanId,
        userId: gymPlanInstance.userId,
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
          eq(gymPlanInstance.status, "in_progress")
        )
      )
      .orderBy(sql`${gymPlanInstance.startedAt} DESC`)
      .limit(1);

    if (!instance) {
      return null;
    }

    // Fetch all plan exercises with their targets and exercise details
    const exercises = await ctx.db
      .select({
        id: gymPlanExercise.id,
        exerciseId: gymPlanExercise.exerciseId,
        sortOrder: gymPlanExercise.sortOrder,
        targetSets: gymPlanExercise.targetSets,
        targetReps: gymPlanExercise.targetReps,
        restSeconds: gymPlanExercise.restSeconds,
        notes: gymPlanExercise.notes,
        exerciseName: exercise.name,
        exerciseDescription: exercise.description,
      })
      .from(gymPlanExercise)
      .leftJoin(exercise, eq(gymPlanExercise.exerciseId, exercise.id))
      .where(eq(gymPlanExercise.gymPlanId, instance.gymPlanId!))
      .orderBy(gymPlanExercise.sortOrder);

    // Fetch all logged sets for this instance
    const sets = await ctx.db
      .select({
        id: instanceSet.id,
        gymPlanInstanceId: instanceSet.gymPlanInstanceId,
        gymPlanExerciseId: instanceSet.gymPlanExerciseId,
        setNumber: instanceSet.setNumber,
        weightKg: instanceSet.weightKg,
        repsCompleted: instanceSet.repsCompleted,
        completedAt: instanceSet.completedAt,
        skipped: instanceSet.skipped,
        notes: instanceSet.notes,
      })
      .from(instanceSet)
      .where(eq(instanceSet.gymPlanInstanceId, instance.id))
      .orderBy(instanceSet.gymPlanExerciseId, instanceSet.setNumber);

    return { ...instance, exercises, sets };
  }),
});

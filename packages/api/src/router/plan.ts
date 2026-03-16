import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { createPlanSchema, updatePlanSchema } from "@gymplan/shared";
import { router, protectedProcedure } from "../middleware/auth.js";
import { gymPlan, gymPlanExercise, exercise, category } from "../db/schema.js";

export const planRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(gymPlan)
      .where(eq(gymPlan.userId, ctx.user.id))
      .orderBy(gymPlan.createdAt);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [plan] = await ctx.db
        .select()
        .from(gymPlan)
        .where(
          and(eq(gymPlan.id, input.id), eq(gymPlan.userId, ctx.user.id))
        )
        .limit(1);

      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
      }

      const exercises = await ctx.db
        .select({
          id: gymPlanExercise.id,
          gymPlanId: gymPlanExercise.gymPlanId,
          exerciseId: gymPlanExercise.exerciseId,
          sortOrder: gymPlanExercise.sortOrder,
          targetSets: gymPlanExercise.targetSets,
          targetReps: gymPlanExercise.targetReps,
          restSeconds: gymPlanExercise.restSeconds,
          notes: gymPlanExercise.notes,
          exerciseName: exercise.name,
          exerciseDescription: exercise.description,
          categoryName: category.name,
        })
        .from(gymPlanExercise)
        .leftJoin(exercise, eq(gymPlanExercise.exerciseId, exercise.id))
        .leftJoin(category, eq(exercise.categoryId, category.id))
        .where(eq(gymPlanExercise.gymPlanId, input.id))
        .orderBy(gymPlanExercise.sortOrder);

      return { ...plan, exercises };
    }),

  create: protectedProcedure
    .input(createPlanSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const [plan] = await tx
          .insert(gymPlan)
          .values({
            userId: ctx.user.id,
            name: input.name,
          })
          .returning();

        const exerciseRows = input.exercises.map((ex) => ({
          gymPlanId: plan.id,
          exerciseId: ex.exerciseId,
          sortOrder: ex.sortOrder,
          targetSets: ex.targetSets,
          targetReps: ex.targetReps,
          restSeconds: ex.restSeconds,
          notes: ex.notes ?? null,
        }));

        await tx.insert(gymPlanExercise).values(exerciseRows);

        return plan;
      });
    }),

  update: protectedProcedure
    .input(updatePlanSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(gymPlan)
        .where(
          and(eq(gymPlan.id, input.id), eq(gymPlan.userId, ctx.user.id))
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Plan not found or not owned by you",
        });
      }

      return ctx.db.transaction(async (tx) => {
        const updates: Record<string, unknown> = {
          updatedAt: new Date(),
        };
        if (input.name !== undefined) updates.name = input.name;

        const [updated] = await tx
          .update(gymPlan)
          .set(updates)
          .where(eq(gymPlan.id, input.id))
          .returning();

        if (input.exercises) {
          await tx
            .delete(gymPlanExercise)
            .where(eq(gymPlanExercise.gymPlanId, input.id));

          const exerciseRows = input.exercises.map((ex) => ({
            gymPlanId: input.id,
            exerciseId: ex.exerciseId,
            sortOrder: ex.sortOrder,
            targetSets: ex.targetSets,
            targetReps: ex.targetReps,
            restSeconds: ex.restSeconds,
            notes: ex.notes ?? null,
          }));

          await tx.insert(gymPlanExercise).values(exerciseRows);
        }

        return updated;
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(gymPlan)
        .where(
          and(eq(gymPlan.id, input.id), eq(gymPlan.userId, ctx.user.id))
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Plan not found or not owned by you",
        });
      }

      await ctx.db.delete(gymPlan).where(eq(gymPlan.id, input.id));

      return { success: true };
    }),
});

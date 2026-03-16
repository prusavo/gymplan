import { TRPCError } from "@trpc/server";
import { eq, and, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import {
  exerciseListQuerySchema,
  createExerciseSchema,
  updateExerciseSchema,
} from "@gymplan/shared";
import { router, protectedProcedure } from "../middleware/auth.js";
import { exercise, exerciseImage, category } from "../db/schema.js";
import { getPresignedUploadUrl } from "../services/s3.js";

export const exerciseRouter = router({
  list: protectedProcedure
    .input(exerciseListQuerySchema)
    .query(async ({ ctx, input }) => {
      const conditions = [eq(exercise.userId, ctx.user.id)];

      if (input.categoryId) {
        conditions.push(eq(exercise.categoryId, input.categoryId));
      }
      if (input.search) {
        conditions.push(ilike(exercise.name, `%${input.search}%`));
      }

      const rows = await ctx.db
        .select({
          id: exercise.id,
          userId: exercise.userId,
          name: exercise.name,
          description: exercise.description,
          categoryId: exercise.categoryId,
          categoryName: category.name,
          createdAt: exercise.createdAt,
          updatedAt: exercise.updatedAt,
        })
        .from(exercise)
        .leftJoin(category, eq(exercise.categoryId, category.id))
        .where(and(...conditions))
        .limit(input.limit)
        .offset(input.offset)
        .orderBy(exercise.name);

      return rows;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [ex] = await ctx.db
        .select()
        .from(exercise)
        .where(
          and(eq(exercise.id, input.id), eq(exercise.userId, ctx.user.id))
        )
        .limit(1);

      if (!ex) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Exercise not found" });
      }

      const images = await ctx.db
        .select()
        .from(exerciseImage)
        .where(eq(exerciseImage.exerciseId, input.id))
        .orderBy(exerciseImage.sortOrder);

      return { ...ex, images };
    }),

  create: protectedProcedure
    .input(createExerciseSchema)
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(exercise)
        .values({
          userId: ctx.user.id,
          name: input.name,
          description: input.description ?? null,
          categoryId: input.categoryId,
        })
        .returning();

      return created;
    }),

  update: protectedProcedure
    .input(updateExerciseSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(exercise)
        .where(
          and(eq(exercise.id, input.id), eq(exercise.userId, ctx.user.id))
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Exercise not found or not owned by you",
        });
      }

      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
      };
      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (input.categoryId !== undefined) updates.categoryId = input.categoryId;

      const [updated] = await ctx.db
        .update(exercise)
        .set(updates)
        .where(eq(exercise.id, input.id))
        .returning();

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(exercise)
        .where(
          and(eq(exercise.id, input.id), eq(exercise.userId, ctx.user.id))
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Exercise not found or not owned by you",
        });
      }

      await ctx.db.delete(exercise).where(eq(exercise.id, input.id));

      return { success: true };
    }),

  getUploadUrl: protectedProcedure
    .input(
      z.object({
        exerciseId: z.string().uuid(),
        fileName: z.string().min(1),
        contentType: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(exercise)
        .where(
          and(
            eq(exercise.id, input.exerciseId),
            eq(exercise.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Exercise not found or not owned by you",
        });
      }

      const key = `exercises/${ctx.user.id}/${input.exerciseId}/${Date.now()}-${input.fileName}`;
      const uploadUrl = await getPresignedUploadUrl(key);
      const publicUrl = `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${key}`;

      return { uploadUrl, publicUrl, key };
    }),
});

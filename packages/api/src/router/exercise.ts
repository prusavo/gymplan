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

function escapeLike(str: string): string {
  return str.replace(/[%_\\]/g, "\\$&");
}

export const exerciseRouter = router({
  list: protectedProcedure
    .input(exerciseListQuerySchema)
    .query(async ({ ctx, input }) => {
      const conditions = [eq(exercise.userId, ctx.user.id)];

      if (input.categoryId) {
        conditions.push(eq(exercise.categoryId, input.categoryId));
      }
      if (input.search) {
        conditions.push(ilike(exercise.name, `%${escapeLike(input.search)}%`));
      }

      const whereClause = and(...conditions);

      const [rows, countResult] = await Promise.all([
        ctx.db
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
          .where(whereClause)
          .limit(input.limit)
          .offset(input.cursor)
          .orderBy(exercise.name),
        ctx.db
          .select({ count: sql<number>`count(*)::int` })
          .from(exercise)
          .where(whereClause),
      ]);

      return { exercises: rows, total: countResult[0]?.count ?? 0 };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
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
        .where(
          and(eq(exercise.id, input.id), eq(exercise.userId, ctx.user.id))
        )
        .limit(1);

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Exercise not found" });
      }

      const images = await ctx.db
        .select()
        .from(exerciseImage)
        .where(eq(exerciseImage.exerciseId, input.id))
        .orderBy(exerciseImage.sortOrder);

      return { ...row, images };
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
      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
      };
      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (input.categoryId !== undefined) updates.categoryId = input.categoryId;

      const ownershipClause = and(
        eq(exercise.id, input.id),
        eq(exercise.userId, ctx.user.id)
      );

      const [updated] = await ctx.db
        .update(exercise)
        .set(updates)
        .where(ownershipClause)
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Exercise not found or not owned by you",
        });
      }

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const ownershipClause = and(
        eq(exercise.id, input.id),
        eq(exercise.userId, ctx.user.id)
      );

      const [deleted] = await ctx.db
        .delete(exercise)
        .where(ownershipClause)
        .returning({ id: exercise.id });

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Exercise not found or not owned by you",
        });
      }

      return { success: true };
    }),

  getUploadUrl: protectedProcedure
    .input(
      z.object({
        exerciseId: z.string().uuid(),
        fileName: z.string().min(1).max(255).regex(/^[\w\-]+\.\w+$/),
        contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
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

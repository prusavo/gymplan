import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { registerSchema, loginSchema } from "@gymplan/shared";
import { router, publicProcedure, protectedProcedure } from "../middleware/auth.js";
import { appUser } from "../db/schema.js";

function signToken(user: { id: string; email: string }): string {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );
}

export const authRouter = router({
  register: publicProcedure.input(registerSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db
      .select()
      .from(appUser)
      .where(eq(appUser.email, input.email))
      .limit(1);

    if (existing.length > 0) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "A user with this email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const [user] = await ctx.db
      .insert(appUser)
      .values({
        email: input.email,
        passwordHash,
        displayName: input.displayName,
      })
      .returning({
        id: appUser.id,
        email: appUser.email,
        displayName: appUser.displayName,
        createdAt: appUser.createdAt,
      });

    const token = signToken(user);

    return { token, user };
  }),

  login: publicProcedure.input(loginSchema).mutation(async ({ ctx, input }) => {
    const [user] = await ctx.db
      .select()
      .from(appUser)
      .where(eq(appUser.email, input.email))
      .limit(1);

    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }

    const token = signToken(user);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt,
      },
    };
  }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const [user] = await ctx.db
      .select({
        id: appUser.id,
        email: appUser.email,
        displayName: appUser.displayName,
        createdAt: appUser.createdAt,
      })
      .from(appUser)
      .where(eq(appUser.id, ctx.user.id))
      .limit(1);

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    return user;
  }),
});

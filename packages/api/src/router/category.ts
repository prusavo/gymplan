import { asc } from "drizzle-orm";
import { router, publicProcedure } from "../middleware/auth.js";
import { category } from "../db/schema.js";

export const categoryRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(category)
      .orderBy(asc(category.sortOrder));
  }),
});

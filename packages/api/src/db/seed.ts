import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { category, exercise, appUser } from "./schema.js";
import { CATEGORIES } from "@gymplan/shared";
import bcrypt from "bcryptjs";

async function seed() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const db = drizzle(pool);

  console.log("Seeding categories...");
  const categoryRows = CATEGORIES.map((name, index) => ({
    id: crypto.randomUUID(),
    name,
    sortOrder: index,
  }));

  await db.insert(category).values(categoryRows).onConflictDoNothing();

  console.log("Seeding demo user...");
  const passwordHash = await bcrypt.hash("password123", 12);
  const [demoUser] = await db
    .insert(appUser)
    .values({
      email: "demo@gymplan.dev",
      passwordHash,
      displayName: "Demo User",
    })
    .onConflictDoNothing()
    .returning();

  if (demoUser) {
    console.log("Seeding sample exercises...");
    const cats = await db.select().from(category);
    const catMap = new Map(cats.map((c) => [c.name, c.id]));

    await db
      .insert(exercise)
      .values([
        {
          userId: demoUser.id,
          name: "Barbell Bench Press",
          description: "Flat bench press with barbell",
          categoryId: catMap.get("chest")!,
        },
        {
          userId: demoUser.id,
          name: "Deadlift",
          description: "Conventional deadlift from the floor",
          categoryId: catMap.get("back")!,
        },
        {
          userId: demoUser.id,
          name: "Barbell Squat",
          description: "Back squat with barbell",
          categoryId: catMap.get("legs")!,
        },
        {
          userId: demoUser.id,
          name: "Overhead Press",
          description: "Standing barbell overhead press",
          categoryId: catMap.get("shoulders")!,
        },
        {
          userId: demoUser.id,
          name: "Barbell Curl",
          description: "Standing barbell bicep curl",
          categoryId: catMap.get("biceps")!,
        },
        {
          userId: demoUser.id,
          name: "Tricep Dips",
          description: "Bodyweight or weighted dips for triceps",
          categoryId: catMap.get("triceps")!,
        },
      ])
      .onConflictDoNothing();
  }

  console.log("Seed complete.");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

import { router } from "../middleware/auth.js";
import { authRouter } from "./auth.js";
import { categoryRouter } from "./category.js";
import { exerciseRouter } from "./exercise.js";
import { planRouter } from "./plan.js";
import { workoutRouter } from "./workout.js";
import { progressRouter } from "./progress.js";

export const appRouter = router({
  auth: authRouter,
  category: categoryRouter,
  exercise: exerciseRouter,
  plan: planRouter,
  workout: workoutRouter,
  progress: progressRouter,
});

export type AppRouter = typeof appRouter;

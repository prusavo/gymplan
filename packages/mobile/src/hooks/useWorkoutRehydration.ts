import { useEffect, useRef } from "react";
import { useWorkoutStore } from "../stores/workoutStore";
import { trpc } from "../api/trpc";

/**
 * On app launch, if the Zustand persisted store contains an active workout
 * (activeInstanceId is set), verify it against the server via workout.getActive.
 *
 * - If the server confirms the workout is still in_progress, clear any stale
 *   rest timer that has expired (already handled by resumeWorkout).
 * - If the server says there is no active workout (completed/abandoned externally),
 *   clear the local persisted state so the user starts fresh.
 *
 * This hook should be mounted once, ideally in the workout tab index screen
 * or the root layout.
 */
export function useWorkoutRehydration(): { isRehydrating: boolean } {
  const activeInstanceId = useWorkoutStore((s) => s.activeInstanceId);
  const clearWorkout = useWorkoutStore((s) => s.clearWorkout);
  const resumeWorkout = useWorkoutStore((s) => s.resumeWorkout);
  const hasRehydrated = useRef(false);

  // Only query when we have a persisted activeInstanceId
  const activeQuery = trpc.workout.getActive.useQuery(undefined, {
    enabled: !!activeInstanceId && !hasRehydrated.current,
    retry: 2,
    staleTime: 0,
  });

  useEffect(() => {
    if (!activeInstanceId) {
      // No persisted workout, nothing to rehydrate
      hasRehydrated.current = true;
      return;
    }

    if (activeQuery.isLoading || activeQuery.isFetching) {
      return;
    }

    if (activeQuery.isSuccess) {
      hasRehydrated.current = true;
      const serverActive = activeQuery.data;

      if (!serverActive || serverActive.id !== activeInstanceId) {
        // Server says the workout is no longer active (completed or abandoned
        // externally, or the instance doesn't match). Clear local state.
        clearWorkout();
      } else {
        // Workout is still active on the server. Resume (clears expired timers).
        resumeWorkout();
      }
    }

    if (activeQuery.isError) {
      // Network error -- keep local state as-is so the user can still resume.
      // The workout will be verified next time the app opens with connectivity.
      hasRehydrated.current = true;
      resumeWorkout();
    }
  }, [
    activeInstanceId,
    activeQuery.isLoading,
    activeQuery.isFetching,
    activeQuery.isSuccess,
    activeQuery.isError,
    activeQuery.data,
    clearWorkout,
    resumeWorkout,
  ]);

  return {
    isRehydrating: !!activeInstanceId && !hasRehydrated.current && activeQuery.isLoading,
  };
}

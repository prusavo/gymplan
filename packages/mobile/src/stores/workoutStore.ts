import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface LoggedSet {
  gymPlanExerciseId: string;
  setNumber: number;
  weightKg: number | null;
  repsCompleted: number;
  skipped: boolean;
  completedAt: string;
}

interface WorkoutState {
  activeInstanceId: string | null;
  activePlanId: string | null;
  activePlanName: string | null;
  exerciseIds: string[];
  currentExerciseIndex: number;
  currentSetNumber: number;
  targetSetsPerExercise: Record<string, number>;
  targetRepsPerExercise: Record<string, number>;
  restSecondsPerExercise: Record<string, number>;
  sets: LoggedSet[];
  restEndTime: number | null;
  isResting: boolean;
  startedAt: string | null;
}

interface WorkoutActions {
  startWorkout: (params: {
    instanceId: string;
    planId: string;
    planName: string;
    exercises: Array<{
      gymPlanExerciseId: string;
      targetSets: number;
      targetReps: number;
      restSeconds: number;
    }>;
  }) => void;
  logSet: (weightKg: number | null, repsCompleted: number) => void;
  skipSet: () => void;
  startRest: (seconds: number) => void;
  endRest: () => void;
  nextExercise: () => void;
  completeWorkout: () => void;
  clearWorkout: () => void;
  resumeWorkout: () => void;
  getCurrentExerciseId: () => string | null;
  isWorkoutComplete: () => boolean;
  isExerciseComplete: () => boolean;
}

const initialState: WorkoutState = {
  activeInstanceId: null,
  activePlanId: null,
  activePlanName: null,
  exerciseIds: [],
  currentExerciseIndex: 0,
  currentSetNumber: 1,
  targetSetsPerExercise: {},
  targetRepsPerExercise: {},
  restSecondsPerExercise: {},
  sets: [],
  restEndTime: null,
  isResting: false,
  startedAt: null,
};

export const useWorkoutStore = create<WorkoutState & WorkoutActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      startWorkout: ({ instanceId, planId, planName, exercises }) => {
        const exerciseIds = exercises.map((e) => e.gymPlanExerciseId);
        const targetSets: Record<string, number> = {};
        const targetReps: Record<string, number> = {};
        const restSeconds: Record<string, number> = {};
        exercises.forEach((e) => {
          targetSets[e.gymPlanExerciseId] = e.targetSets;
          targetReps[e.gymPlanExerciseId] = e.targetReps;
          restSeconds[e.gymPlanExerciseId] = e.restSeconds;
        });

        set({
          activeInstanceId: instanceId,
          activePlanId: planId,
          activePlanName: planName,
          exerciseIds,
          currentExerciseIndex: 0,
          currentSetNumber: 1,
          targetSetsPerExercise: targetSets,
          targetRepsPerExercise: targetReps,
          restSecondsPerExercise: restSeconds,
          sets: [],
          restEndTime: null,
          isResting: false,
          startedAt: new Date().toISOString(),
        });
      },

      logSet: (weightKg, repsCompleted) => {
        const state = get();
        const exerciseId = state.exerciseIds[state.currentExerciseIndex];
        if (!exerciseId) return;

        const newSet: LoggedSet = {
          gymPlanExerciseId: exerciseId,
          setNumber: state.currentSetNumber,
          weightKg,
          repsCompleted,
          skipped: false,
          completedAt: new Date().toISOString(),
        };

        const targetSets = state.targetSetsPerExercise[exerciseId] ?? 3;
        const isLastSet = state.currentSetNumber >= targetSets;
        const isLastExercise =
          state.currentExerciseIndex >= state.exerciseIds.length - 1;

        if (isLastSet && isLastExercise) {
          set({
            sets: [...state.sets, newSet],
            currentSetNumber: state.currentSetNumber + 1,
            isResting: false,
            restEndTime: null,
          });
        } else if (isLastSet) {
          set({
            sets: [...state.sets, newSet],
            currentSetNumber: state.currentSetNumber + 1,
            isResting: false,
            restEndTime: null,
          });
        } else {
          const restSec = state.restSecondsPerExercise[exerciseId] ?? 90;
          set({
            sets: [...state.sets, newSet],
            currentSetNumber: state.currentSetNumber + 1,
            isResting: true,
            restEndTime: Date.now() + restSec * 1000,
          });
        }
      },

      skipSet: () => {
        const state = get();
        const exerciseId = state.exerciseIds[state.currentExerciseIndex];
        if (!exerciseId) return;

        const newSet: LoggedSet = {
          gymPlanExerciseId: exerciseId,
          setNumber: state.currentSetNumber,
          weightKg: null,
          repsCompleted: 0,
          skipped: true,
          completedAt: new Date().toISOString(),
        };

        const targetSets = state.targetSetsPerExercise[exerciseId] ?? 3;
        const isLastSet = state.currentSetNumber >= targetSets;

        if (isLastSet) {
          set({
            sets: [...state.sets, newSet],
            currentSetNumber: state.currentSetNumber + 1,
          });
        } else {
          set({
            sets: [...state.sets, newSet],
            currentSetNumber: state.currentSetNumber + 1,
          });
        }
      },

      startRest: (seconds) => {
        set({
          isResting: true,
          restEndTime: Date.now() + seconds * 1000,
        });
      },

      endRest: () => {
        set({ isResting: false, restEndTime: null });
      },

      nextExercise: () => {
        const state = get();
        if (state.currentExerciseIndex < state.exerciseIds.length - 1) {
          set({
            currentExerciseIndex: state.currentExerciseIndex + 1,
            currentSetNumber: 1,
            isResting: false,
            restEndTime: null,
          });
        }
      },

      completeWorkout: () => {
        set({ ...initialState });
      },

      clearWorkout: () => {
        set({ ...initialState });
      },

      resumeWorkout: () => {
        // State is already persisted, just clear rest if expired
        const state = get();
        if (state.restEndTime && Date.now() > state.restEndTime) {
          set({ isResting: false, restEndTime: null });
        }
      },

      getCurrentExerciseId: () => {
        const state = get();
        return state.exerciseIds[state.currentExerciseIndex] ?? null;
      },

      isWorkoutComplete: () => {
        const state = get();
        if (state.exerciseIds.length === 0) return false;
        const lastExerciseId =
          state.exerciseIds[state.exerciseIds.length - 1];
        if (!lastExerciseId) return false;
        const targetSets =
          state.targetSetsPerExercise[lastExerciseId] ?? 3;
        const isLastExercise =
          state.currentExerciseIndex >= state.exerciseIds.length - 1;
        return isLastExercise && state.currentSetNumber > targetSets;
      },

      isExerciseComplete: () => {
        const state = get();
        const exerciseId = state.exerciseIds[state.currentExerciseIndex];
        if (!exerciseId) return false;
        const targetSets =
          state.targetSetsPerExercise[exerciseId] ?? 3;
        return state.currentSetNumber > targetSets;
      },
    }),
    {
      name: "gymplan-workout-store",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

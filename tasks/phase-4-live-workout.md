# Phase 4: Live Workout

**Status**: TODO

Build the workout execution engine and live workout screen so users can start a plan, log sets in real time, and complete or abandon the session.

## Tasks

### API

- [ ] **workout.start router** -- Mutation creating a `gym_plan_instance` with status `in_progress`. Reject if user already has an active workout.
- [ ] **workout.logSet router** -- Mutation inserting an `instance_set` record. Validate that the instance is `in_progress` and owned by user.
- [ ] **workout.skipSet router** -- Mutation inserting an `instance_set` with `skipped: true` and `reps_completed: 0`.
- [ ] **workout.complete router** -- Mutation setting status to `completed`, `completed_at` to now. Optional notes.
- [ ] **workout.abandon router** -- Mutation setting status to `abandoned`, `completed_at` to now. Preserves all logged sets.
- [ ] **workout.getActive router** -- Query returning the user's `in_progress` instance (if any) with its sets and plan exercises.

### Mobile

- [ ] **Live workout screen** -- Full-screen guided workout view. Shows current exercise, set number, target reps, and previous performance.
- [ ] **Weight/reps steppers** -- Increment/decrement controls for weight (0.5 kg steps) and reps (1 step). Pre-filled with targets or last workout values.
- [ ] **Log set button** -- Records the set via API and advances to the next set or exercise.
- [ ] **Skip set button** -- Marks set as skipped and advances.
- [ ] **Rest timer** -- Countdown timer (based on `restSeconds` from plan config) that starts automatically after logging a set. Visual countdown with progress ring.
- [ ] **Exercise navigation** -- Ability to move between exercises in the plan (next/previous or tap exercise list).
- [ ] **Complete workout button** -- Available after all sets are logged or skipped. Shows summary before confirming.
- [ ] **Abandon workout button** -- Available at any time. Confirmation dialog warns that the workout will be marked as abandoned.
- [ ] **Workout summary** -- Post-workout screen showing exercises completed, total volume, duration.

### Crash Recovery

- [ ] **Zustand persisted store** -- Store active workout state (instanceId, current exercise index, logged sets) in AsyncStorage via Zustand persist middleware.
- [ ] **Rehydration on app open** -- On app launch, check for persisted workout state. If found, query `workout.getActive` to verify it is still `in_progress` and resume.
- [ ] **Cleanup on complete/abandon** -- Clear persisted state when workout ends.

### UX Enhancements

- [ ] **Keep-awake** -- Use `expo-keep-awake` to prevent screen from sleeping during a workout.
- [ ] **Haptic feedback** -- Trigger haptic on set logged, set skipped, and timer complete using `expo-haptics`.
- [ ] **Sound on timer complete** -- Optional short sound when rest timer finishes.

## Acceptance Criteria

- User can start a workout from a plan and log sets for each exercise.
- Rest timer counts down between sets based on plan configuration.
- Skipping a set records it as skipped and advances the workout.
- Completing a workout transitions to `completed` status and shows a summary.
- Abandoning a workout preserves all logged sets.
- Closing and reopening the app during a workout resumes where the user left off.
- Screen stays awake during the workout.
- Only one active workout per user at a time.

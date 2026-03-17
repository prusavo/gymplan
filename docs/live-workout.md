# Live Workout (Phase 4)

The live workout feature lets users start a workout from a plan, log sets in real time with weight and rep tracking, and complete or abandon the session. It includes a rest timer between sets, crash recovery via persisted state, and UX enhancements like haptic feedback and screen keep-awake.

## How It Works

### Workout Lifecycle

A workout goes through these states:

```
[Plan selected] --> start --> IN_PROGRESS --> complete --> COMPLETED
                                   |
                                   +--> abandon --> ABANDONED
```

Only one workout can be `in_progress` per user at a time. Attempting to start a second workout returns a `CONFLICT` error.

### Starting a Workout

1. The user navigates to the **Workout** tab and selects a plan.
2. The mobile app calls `workout.start` with the plan ID.
3. The API creates a `gym_plan_instance` row with `status: "in_progress"`.
4. The Zustand store initializes local workout state (exercise order, targets, rest durations).
5. The user is routed to the active workout screen.

### Logging Sets

For each exercise, the user sees the current set number, target reps, and weight/rep steppers.

- **Complete Set** -- Calls `workout.logSet` and records the set both locally and on the server. Weight is in 0.5 kg increments, reps in increments of 1. Weight and reps pre-fill from the previous set of the same exercise (or the plan target for the first set).
- **Skip Set** -- Calls `workout.skipSet`. Records the set with `skipped: true` and `repsCompleted: 0`. Advances to the next set.

Both operations use upsert logic (`ON CONFLICT DO UPDATE`) so re-submitting the same set number is safe and idempotent.

### Rest Timer

After logging a non-final set, a rest timer starts automatically. The duration comes from the plan exercise's `restSeconds` field (default: 90 seconds).

The timer displays as a circular progress ring using `@shopify/react-native-skia`. When the last 5 seconds remain, the ring color changes to a warning color to signal urgency.

When the timer completes:
1. The device vibrates (double pulse pattern).
2. A haptic notification fires via `expo-haptics`.
3. A short 880 Hz beep plays via `expo-av` (works in silent mode on iOS).

The user can tap **Skip Rest** to dismiss the timer early.

### Exercise Navigation

- **Next/Previous arrows** in the header move between exercises.
- **Exercise list overlay** (tap the exercise counter) shows all exercises with completion status. Tap any exercise to jump to it.
- When all sets for an exercise are logged, the app shows an "Exercise Complete" screen with a preview of the next exercise.

### Completing a Workout

After all exercises and sets are logged, the **Complete Workout** button appears. Tapping it calls `workout.complete`, which sets the instance status to `completed` and records `completed_at`. The user is routed to the summary screen.

### Abandoning a Workout

The **Abandon Workout** button is always available at the bottom of the active workout screen. It shows a confirmation dialog. On confirm, `workout.abandon` sets the status to `abandoned`. All logged sets are preserved in the database.

### Workout Summary

After completing a workout, the summary screen shows:

- **Duration** -- Elapsed time from start to completion.
- **Total volume** -- Sum of (weight x reps) across all completed sets, in kg.
- **Exercise count** -- Number of unique exercises performed.
- **Set count** -- Number of completed (non-skipped) sets.
- **Per-exercise breakdown** -- Each exercise with its completed/skipped sets, total volume, and best set (highest weight, or highest reps at equal weight).

## Crash Recovery

The workout survives app crashes, force-closes, and device restarts.

### How Persistence Works

The `useWorkoutStore` Zustand store uses the `persist` middleware with `AsyncStorage` as the storage backend. The store key is `gymplan-workout-store`. Every state change (log set, skip set, navigate exercise) is automatically written to `AsyncStorage`.

The persisted state includes:
- `activeInstanceId` -- The server-side instance UUID.
- `activePlanId` and `activePlanName` -- For display and API queries.
- `exerciseIds` -- Ordered list of plan exercise IDs.
- `currentExerciseIndex` and `currentSetNumber` -- Where the user left off.
- `targetSetsPerExercise`, `targetRepsPerExercise`, `restSecondsPerExercise` -- Plan configuration.
- `sets` -- All locally logged sets (the local source of truth).
- `restEndTime` -- Absolute timestamp for the rest timer (if active).
- `startedAt` -- Workout start time for duration calculation.

### Rehydration on App Open

The `useWorkoutRehydration` hook runs on the workout tab's index screen. It follows this logic:

```
App opens
  |
  +-- No persisted activeInstanceId? --> Done (fresh state)
  |
  +-- Has persisted activeInstanceId
        |
        +-- Call workout.getActive
              |
              +-- Server returns matching instance --> resumeWorkout()
              |     (clears expired rest timers, keeps all local state)
              |
              +-- Server returns null or different ID --> clearWorkout()
              |     (workout was completed/abandoned externally)
              |
              +-- Network error --> resumeWorkout()
                    (keep local state, verify next time)
```

The hook exposes `isRehydrating: boolean` so the workout index screen can show a loading state while the server check completes.

### Cleanup

When a workout ends (complete or abandon), the store resets to `initialState` and explicitly calls `AsyncStorage.removeItem("gymplan-workout-store")` to remove the persisted data.

## UX Enhancements

### Keep-Awake

The active workout screen calls `activateKeepAwakeAsync("workout")` on mount and `deactivateKeepAwake("workout")` on unmount, using `expo-keep-awake`. This prevents the screen from dimming or locking during a workout.

### Haptic Feedback

Uses `expo-haptics` for tactile feedback:

| Event | Haptic Type |
|---|---|
| Set logged | `ImpactFeedbackStyle.Medium` |
| Set skipped | `ImpactFeedbackStyle.Light` |
| Rest timer complete | `NotificationFeedbackType.Success` |
| Skip rest tapped | `ImpactFeedbackStyle.Light` |

### Sound

The rest timer completion plays a programmatically generated 880 Hz (A5 note) beep, 150 ms long with a linear fade-out envelope. The beep is generated as an inline WAV data URI -- no bundled audio asset file is required.

Audio configuration:
- `playsInSilentModeIOS: true` -- The beep plays even when the iOS silent switch is on.
- `shouldDuckAndroid: true` -- Lowers other audio briefly on Android.
- Sound resources are unloaded when the active workout screen unmounts.

### Vibration

On rest timer completion, the device vibrates with a double-pulse pattern: `[0, 500, 200, 500]` (pause, vibrate 500ms, pause 200ms, vibrate 500ms).

## Key Files

| File | Purpose |
|---|---|
| `packages/api/src/router/workout.ts` | All workout tRPC procedures (start, logSet, skipSet, complete, abandon, getActive) |
| `packages/shared/src/schemas/workout.ts` | Zod input schemas for workout procedures |
| `packages/mobile/app/(tabs)/workout/index.tsx` | Workout tab entry: plan picker or resume prompt |
| `packages/mobile/app/(tabs)/workout/active.tsx` | Active workout screen: exercise UI, set logging, rest timer, navigation |
| `packages/mobile/app/(tabs)/workout/summary.tsx` | Post-workout summary with stats and per-exercise breakdown |
| `packages/mobile/src/stores/workoutStore.ts` | Zustand persisted store for all workout client state |
| `packages/mobile/src/hooks/useWorkoutRehydration.ts` | Crash recovery: validates persisted state against server on app open |
| `packages/mobile/src/hooks/useCountdownTimer.ts` | Countdown timer hook driven by `restEndTime` |
| `packages/mobile/src/components/ui/CountdownTimer.tsx` | Circular progress ring timer (Skia) |
| `packages/mobile/src/utils/sound.ts` | Programmatic beep generation and playback |

## Constraints and Edge Cases

- **One active workout per user** -- The API rejects `workout.start` if an `in_progress` instance already exists. The mobile app shows a "Resume or Abandon" prompt instead of the plan picker.
- **Offline resilience** -- Set logging continues locally even if the API call fails. The local Zustand store is the source of truth for the current session. Sets are sent to the server optimistically; failures are swallowed.
- **Upsert on logSet/skipSet** -- If the same (instanceId, gymPlanExerciseId, setNumber) is submitted twice, the row is updated rather than duplicated. This makes retries and re-submissions safe.
- **Rest timer persistence** -- The rest timer stores an absolute `restEndTime` timestamp (not a countdown). On rehydration, if `Date.now() > restEndTime`, the rest period is considered complete and the timer is cleared.
- **Weight precision** -- Weights use 0.5 kg increments on the client. The API stores `weightKg` as a decimal string in the database to avoid floating-point drift.

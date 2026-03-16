# Phase 3: Plan Builder

**Status**: TODO

Build the workout plan CRUD API and mobile screens so users can create, configure, and manage workout plans.

## Tasks

### API

- [ ] **plan.list router** -- Query returning all plans for the current user.
- [ ] **plan.getById router** -- Query returning plan with exercises (joined with exercise details). Ownership check.
- [ ] **plan.create router** -- Mutation validating `createPlanSchema`. Inserts plan + exercises in a transaction.
- [ ] **plan.update router** -- Mutation validating `updatePlanSchema`. Replaces exercises array if provided (delete old, insert new).
- [ ] **plan.delete router** -- Mutation deleting plan. Cascade deletes plan exercises.

### Mobile

- [ ] **Plan list screen** -- FlatList of plans with name and exercise count. Tap to view detail.
- [ ] **Plan detail screen** -- Shows plan name and ordered list of exercises with sets/reps/rest config. Start workout and edit buttons.
- [ ] **Create plan screen** -- Name input + exercise picker. Add exercises from the library.
- [ ] **Exercise picker** -- Modal or screen to select exercises, with category filter.
- [ ] **Sets/reps/rest config** -- Per-exercise inline controls: stepper for sets (1-20), reps (1-100), rest seconds (0-600).
- [ ] **Drag-to-reorder** -- Drag handle on each exercise row to reorder within the plan.
- [ ] **Edit plan screen** -- Pre-populated, same layout as create. Supports adding, removing, reordering.
- [ ] **Delete plan confirmation** -- Alert dialog before deletion.

### Integration

- [ ] **Wire tRPC calls** -- Connect plan screens to API procedures.
- [ ] **Optimistic UI for reorder** -- Update local order immediately, sync to API.
- [ ] **Loading and error states** -- Consistent with Phase 2 patterns.

## Acceptance Criteria

- User can create a plan with multiple exercises, each with custom sets/reps/rest.
- Exercises can be reordered by dragging.
- Plan detail shows the full exercise configuration.
- User can edit a plan (rename, add/remove exercises, change config).
- Deleting a plan removes it from the list.

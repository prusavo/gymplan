# Phase 3: Plan Builder

**Status**: DONE

Build the workout plan CRUD API and mobile screens so users can create, configure, and manage workout plans.

## Tasks

### API

- [x] **plan.list router** -- Query returning all plans for the current user with exercise count.
- [x] **plan.getById router** -- Query returning plan with exercises (joined with exercise details). Ownership check.
- [x] **plan.create router** -- Mutation validating `createPlanSchema`. Inserts plan + exercises in a transaction.
- [x] **plan.update router** -- Mutation validating `updatePlanSchema`. Replaces exercises array if provided (delete old, insert new).
- [x] **plan.delete router** -- Mutation deleting plan. Cascade deletes plan exercises.

### Mobile

- [x] **Plan list screen** -- FlatList of plans with name and exercise count. Tap to view detail.
- [x] **Plan detail screen** -- Shows plan name and ordered list of exercises with sets/reps/rest config. Start workout, edit, and delete buttons. Edit Order mode with optimistic reorder.
- [x] **Create plan screen** -- Name input + exercise picker. Add exercises from the library.
- [x] **Exercise picker** -- Modal with search and category filter chips.
- [x] **Sets/reps/rest config** -- Per-exercise inline controls: stepper for sets (1-20), reps (1-100), rest seconds (0-600).
- [x] **Drag-to-reorder** -- Up/down chevron buttons on each exercise row to reorder within the plan (builder + detail screen edit mode).
- [x] **Edit plan screen** -- Pre-populated, same layout as create. Supports adding, removing, reordering.
- [x] **Delete plan confirmation** -- Alert dialog before deletion.

### Integration

- [x] **Wire tRPC calls** -- Connect plan screens to API procedures.
- [x] **Optimistic UI for reorder** -- Update local order immediately, sync to API with rollback on error.
- [x] **Loading and error states** -- Consistent with Phase 2 patterns.

## Acceptance Criteria

- User can create a plan with multiple exercises, each with custom sets/reps/rest.
- Exercises can be reordered by dragging.
- Plan detail shows the full exercise configuration.
- User can edit a plan (rename, add/remove exercises, change config).
- Deleting a plan removes it from the list.

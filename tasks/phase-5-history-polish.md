# Phase 5: History, Progress, and Polish

**Status**: TODO

Build workout history, progress tracking, and polish the app with proper empty/loading/error states and image upload.

## Tasks

### API

- [ ] **progress.instanceHistory router** -- Query returning paginated list of completed/abandoned workout instances with plan name and date.
- [ ] **progress.exerciseHistory router** -- Query returning paginated sets for a specific exercise across all workouts, ordered by date.
- [ ] **progress.personalRecords router** -- Query computing max weight, max reps, and max volume (weight x reps) per exercise.

### Mobile -- History

- [ ] **History list screen** -- FlatList of past workouts showing plan name, date, status (completed/abandoned), duration, and total sets.
- [ ] **History detail screen** -- Full breakdown of a workout instance: each exercise with all logged sets (weight, reps, skipped).
- [ ] **Empty state for history** -- Friendly message when no workouts have been completed yet, with a CTA to start one.

### Mobile -- Progress

- [ ] **Progress charts** -- Line chart showing exercise volume over time (e.g., total weight lifted per session). Use a chart library compatible with React Native.
- [ ] **Personal records screen** -- List of exercises with PR badges (max weight, max reps, max volume).
- [ ] **Exercise history view** -- Accessible from exercise detail, shows all sets ever logged for that exercise.

### Mobile -- Image Upload

- [ ] **Image upload flow** -- On exercise detail/edit screen, tap to add image. Request presigned URL via `exercise.getUploadUrl`, upload image directly to S3, then save the image URL to `exercise_image`.
- [ ] **Image display** -- Show exercise images in exercise detail screen (horizontal scroll if multiple).
- [ ] **Image deletion** -- Allow removing images from an exercise.

### Polish

- [ ] **Empty states** -- All list screens show helpful empty states with guidance ("No exercises yet -- tap + to create one").
- [ ] **Loading states** -- Skeleton placeholders or spinners on all screens while data loads.
- [ ] **Error states** -- Inline error messages with retry buttons for failed API calls.
- [ ] **Pull-to-refresh** -- All list screens support pull-to-refresh.
- [ ] **Toast notifications** -- Success/error toasts for mutations (create, update, delete, complete workout).
- [ ] **Input validation feedback** -- Form fields show validation errors inline before submission.

## Acceptance Criteria

- User can view a list of past workouts and drill into details.
- User can see personal records per exercise.
- Progress charts show exercise volume trends over time.
- User can upload and view exercise images.
- All screens handle empty, loading, and error states gracefully.
- No screen shows a blank white page or unexplained spinner.

# Phase 5: History, Progress, and Polish

**Status**: DONE

Build workout history, progress tracking, and polish the app with proper empty/loading/error states and image upload.

## Tasks

### API

- [x] **progress.instanceHistory router** -- Query returning paginated list of completed/abandoned workout instances with plan name and date.
- [x] **progress.exerciseHistory router** -- Query returning paginated sets for a specific exercise across all workouts, ordered by date.
- [x] **progress.personalRecords router** -- Query computing max weight, max reps, and max volume (weight x reps) per exercise.
- [x] **workout.history router** -- Paginated list of completed/abandoned instances with plan name, total volume, total sets.
- [x] **workout.getById router** -- Single instance with all sets and exercise names.
- [x] **exercise.saveImage router** -- Save image record after S3 upload.
- [x] **exercise.deleteImage router** -- Delete image with ownership verification.

### Mobile -- History

- [x] **History list screen** -- FlatList of past workouts showing plan name, date, status (completed/abandoned), duration, and total sets.
- [x] **History detail screen** -- Full breakdown of a workout instance: each exercise with all logged sets (weight, reps, skipped).
- [x] **Empty state for history** -- Friendly message when no workouts have been completed yet, with a CTA to start one.

### Mobile -- Progress

- [x] **Progress charts** -- Line chart showing exercise volume over time (e.g., total weight lifted per session). Use a chart library compatible with React Native.
- [x] **Personal records screen** -- List of exercises with PR badges (max weight, max reps, max volume).
- [x] **Exercise history view** -- Accessible from exercise detail, shows all sets ever logged for that exercise.

### Mobile -- Image Upload

- [x] **Image upload flow** -- On exercise detail/edit screen, tap to add image. Request presigned URL via `exercise.getUploadUrl`, upload image directly to S3, then save the image URL to `exercise_image`.
- [x] **Image display** -- Show exercise images in exercise detail screen (horizontal scroll if multiple).
- [x] **Image deletion** -- Allow removing images from an exercise.

### Polish

- [x] **Empty states** -- All list screens show helpful empty states with guidance ("No exercises yet -- tap + to create one").
- [x] **Loading states** -- Skeleton placeholders or spinners on all screens while data loads.
- [x] **Error states** -- Inline error messages with retry buttons for failed API calls.
- [x] **Pull-to-refresh** -- All list screens support pull-to-refresh.
- [x] **Toast notifications** -- Success/error toasts for mutations (create, update, delete, complete workout).
- [x] **Input validation feedback** -- Form fields show validation errors inline before submission.

## Acceptance Criteria

- User can view a list of past workouts and drill into details.
- User can see personal records per exercise.
- Progress charts show exercise volume trends over time.
- User can upload and view exercise images.
- All screens handle empty, loading, and error states gracefully.
- No screen shows a blank white page or unexplained spinner.

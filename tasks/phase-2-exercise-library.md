# Phase 2: Exercise Library

**Status**: TODO

Build the exercise CRUD API and mobile screens so users can browse, create, edit, and delete exercises.

## Tasks

### API

- [ ] **category.list router** -- Query that returns all categories sorted by `sortOrder`.
- [ ] **exercise.list router** -- Query with optional `categoryId` filter, `search` text, pagination (`limit`/`offset`). Returns exercises + total count.
- [ ] **exercise.getById router** -- Query returning exercise with images. 404 if not found or wrong user.
- [ ] **exercise.create router** -- Mutation validating `createExerciseSchema`, inserting with current user's ID.
- [ ] **exercise.update router** -- Mutation validating `updateExerciseSchema`, partial update. Ownership check.
- [ ] **exercise.delete router** -- Mutation deleting exercise and cascaded images. Ownership check.
- [ ] **exercise.getUploadUrl router** -- Mutation generating presigned S3 URL for image upload.

### Mobile

- [ ] **Exercise list screen** -- FlatList showing exercises grouped or filtered by category. Pull-to-refresh.
- [ ] **Category filter bar** -- Horizontal scrollable category chips. Tapping a chip filters the list.
- [ ] **Search bar** -- Text input that filters exercises by name (debounced).
- [ ] **Exercise detail screen** -- Shows name, description, category, images. Edit and delete buttons.
- [ ] **Create exercise form** -- Name input, description textarea, category picker. Validation feedback.
- [ ] **Edit exercise form** -- Pre-populated form, same layout as create.
- [ ] **Delete confirmation** -- Alert dialog before deletion.

### Integration

- [ ] **Wire tRPC calls** -- Connect all screens to the corresponding API procedures via tRPC client.
- [ ] **Loading states** -- Skeleton or spinner for list and detail screens.
- [ ] **Error handling** -- Toast or inline error for failed API calls.

## Acceptance Criteria

- User can create an exercise, see it in the list, edit it, and delete it.
- Category filter narrows the list to matching exercises.
- Search finds exercises by partial name match.
- Pagination loads more exercises on scroll.

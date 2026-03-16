# Phase 2: Exercise Library

**Status**: DONE

Build the exercise CRUD API and mobile screens so users can browse, create, edit, and delete exercises.

## Tasks

### API

- [x] **category.list router** -- Query that returns all categories sorted by `sortOrder`.
- [x] **exercise.list router** -- Query with optional `categoryId` filter, `search` text, pagination (`limit`/`cursor`). Returns exercises + total count.
- [x] **exercise.getById router** -- Query returning exercise with images and category name. 404 if not found or wrong user.
- [x] **exercise.create router** -- Mutation validating `createExerciseSchema`, inserting with current user's ID.
- [x] **exercise.update router** -- Mutation validating `updateExerciseSchema`, partial update. Ownership check.
- [x] **exercise.delete router** -- Mutation deleting exercise and cascaded images. Ownership check.
- [x] **exercise.getUploadUrl router** -- Mutation generating presigned S3 URL for image upload.

### Mobile

- [x] **Exercise list screen** -- FlatList showing exercises grouped or filtered by category. Pull-to-refresh. Infinite scroll pagination.
- [x] **Category filter bar** -- Horizontal scrollable category chips. Tapping a chip filters the list.
- [x] **Search bar** -- Text input that filters exercises by name (debounced 300ms). Clear button.
- [x] **Exercise detail screen** -- Shows name, description, category, images. Edit and delete buttons.
- [x] **Create exercise form** -- Name input, description textarea, category picker. Validation feedback.
- [x] **Edit exercise form** -- Pre-populated form, same layout as create.
- [x] **Delete confirmation** -- Alert dialog before deletion.

### Integration

- [x] **Wire tRPC calls** -- Connect all screens to the corresponding API procedures via tRPC client.
- [x] **Loading states** -- Skeleton or spinner for list and detail screens. Pagination footer spinner.
- [x] **Error handling** -- Alert for failed API calls on create, update, and delete mutations.

## Acceptance Criteria

- User can create an exercise, see it in the list, edit it, and delete it.
- Category filter narrows the list to matching exercises.
- Search finds exercises by partial name match.
- Pagination loads more exercises on scroll.

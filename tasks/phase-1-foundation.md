# Phase 1: Foundation

**Status**: DONE

This phase sets up the monorepo structure, local infrastructure, database schema, and API/mobile boilerplate.

## Tasks

- [x] **Monorepo init** -- Create npm workspaces root with `shared`, `api`, and `mobile` packages. Configure `tsconfig.base.json` and workspace scripts.
- [x] **Docker Compose** -- PostgreSQL 16 + MinIO with auto-created `exercise-images` bucket.
- [x] **Shared package** -- Zod schemas for auth, exercise, plan, workout, and progress. Constants for categories, workout statuses, and defaults.
- [x] **Drizzle schema** -- All 8 tables (`app_user`, `category`, `exercise`, `exercise_image`, `gym_plan`, `gym_plan_exercise`, `gym_plan_instance`, `instance_set`) with FKs, unique constraints, and CHECK constraint.
- [x] **Database seed** -- Seed script for categories and demo user with sample exercises.
- [x] **Fastify + tRPC boilerplate** -- API server with tRPC adapter, JWT context extraction, S3 client setup.
- [x] **Expo init** -- Initialize Expo React Native project in `packages/mobile` (placeholder).
- [x] **tRPC client connection** -- Configure tRPC client in mobile to talk to the API.
- [x] **Dark theme** -- Default dark color scheme for the mobile app.

## Deliverables

- `npm run dev:api` starts the API server.
- `npm run dev:mobile` starts the Expo dev server.
- `npm run db:push` applies the schema to PostgreSQL.
- `npm run db:seed` populates categories and demo data.
- tRPC client in mobile can call the API and receive typed responses.

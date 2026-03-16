# System Architecture

## Monorepo Structure

GymPlan uses an npm workspaces monorepo with three packages:

```
gymplan/
  packages/
    shared/     # Zod schemas, constants, shared types
    api/        # Fastify + tRPC backend
    mobile/     # Expo React Native app
```

The root `package.json` defines workspace scripts for development, building, and database operations.

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Mobile | Expo React Native | SDK 51+ |
| API framework | Fastify | 5.x |
| API protocol | tRPC | 11.x |
| Validation | Zod | 3.23+ |
| Database | PostgreSQL | 16 |
| ORM | Drizzle ORM | 0.36+ |
| Object storage | S3-compatible (MinIO locally) | -- |
| Auth | JWT (jsonwebtoken) | 9.x |
| Password hashing | bcryptjs | 2.4+ |
| Language | TypeScript | 5.4+ |

## Architecture Diagram

```
+-------------------+        +-------------------+        +------------------+
|                   |  tRPC  |                   |  SQL   |                  |
|   Expo Mobile     +------->+   Fastify API     +------->+   PostgreSQL     |
|   (React Native)  |  HTTP  |   (tRPC routers)  |Drizzle |                  |
|                   |        |                   |        +------------------+
+-------------------+        +--------+----------+
                                      |
                                      | S3 presigned URL
                                      v
                             +-------------------+
                             |   MinIO / S3      |
                             |   (exercise imgs) |
                             +-------------------+
```

## Package Details

### `@gymplan/shared`

Shared package consumed by both API and mobile. Contains:

- **Zod schemas** for all input validation (auth, exercise, plan, workout, progress)
- **Constants** (category list, workout statuses, defaults for sets/reps/rest)
- **TypeScript types** inferred from Zod schemas

Built with `tsc` to `dist/`. Both API and mobile import from `@gymplan/shared`.

### `@gymplan/api`

Fastify server exposing tRPC routers. Key components:

- **`src/db/schema.ts`** -- Drizzle ORM table definitions (8 tables)
- **`src/db/index.ts`** -- Database connection pool
- **`src/db/seed.ts`** -- Seeds categories and demo data
- **`src/context.ts`** -- tRPC context factory (JWT auth extraction, DB + S3 injection)
- **`src/services/s3.ts`** -- S3 client and presigned URL generation

Runs with `tsx watch` in development.

### `packages/mobile`

Expo React Native app (to be initialized). Planned stack:

- Expo Router for navigation
- tRPC client connected to the API
- Zustand for local state (live workout crash recovery)
- Dark theme by default

## Tech Decisions and Rationale

### Why tRPC over REST or GraphQL?

tRPC provides end-to-end type safety from API router to mobile client without code generation. Since both sides are TypeScript in the same monorepo, tRPC eliminates the entire class of "API contract" bugs. The shared Zod schemas serve as both runtime validation and compile-time types.

### Why Drizzle ORM over Prisma?

Drizzle is lighter weight, has no binary engine dependency, and produces SQL that is easier to reason about. It works well with `drizzle-kit push` for rapid schema iteration during development without migration files.

### Why Fastify over Express?

Fastify has better TypeScript support, built-in schema validation, and significantly better performance. The tRPC Fastify adapter is well-maintained.

### Why PostgreSQL over SQLite?

The data model involves relational joins (plan -> exercises -> sets) and constraints (CHECK on status, unique composites) that benefit from a real relational database. PostgreSQL also supports the app if it ever needs to scale beyond a single device.

### Why MinIO for local development?

MinIO provides an S3-compatible API locally, so the presigned URL workflow matches production exactly. No code changes needed when deploying to AWS S3 or another S3-compatible provider.

### Why Zustand for workout state?

Live workouts need to survive app crashes and backgrounding. Zustand with persistence middleware stores the in-progress workout locally and rehydrates it on app restart, preventing data loss during the most critical user flow.

## Infrastructure (Local Development)

Docker Compose provides PostgreSQL and MinIO:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]

  minio:
    image: minio/minio:latest
    ports: ["9000:9000", "9001:9001"]  # API + Console

  minio-init:
    # Creates the exercise-images bucket with public download
```

## Environment Variables

The API expects these environment variables:

| Variable | Example | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://gymplan:gymplan@localhost:5432/gymplan` | PostgreSQL connection |
| `JWT_SECRET` | `your-secret-key` | JWT signing key |
| `S3_ENDPOINT` | `http://localhost:9000` | S3-compatible endpoint |
| `S3_ACCESS_KEY` | `minioadmin` | S3 access key |
| `S3_SECRET_KEY` | `minioadmin` | S3 secret key |
| `S3_BUCKET` | `exercise-images` | Image upload bucket |

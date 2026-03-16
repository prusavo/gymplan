# GymPlan -- Product Requirements Document

## Overview

GymPlan is a mobile workout tracking app for Android and iOS. It helps gym-goers build structured workout plans, execute guided workouts in real time, and track their progress over time.

**Target user**: People who go to the gym regularly and want a simple, reliable way to plan workouts, log sets during training, and see measurable progress.

## Problem Statement

Most gym-goers either wing their workouts (no plan, no tracking) or rely on paper notes and memory. This leads to inconsistent training, missed progression, and wasted time at the gym deciding what to do next. GymPlan gives users a structured system that guides them through each workout and tracks everything automatically.

## MVP Scope

The MVP delivers three connected capabilities:

1. **Exercise library** -- Create and organize exercises by muscle group category.
2. **Plan builder** -- Assemble exercises into reusable workout plans with sets, reps, and rest configuration.
3. **Live workout execution** -- Start a plan, log sets in real time with rest timers, and save the completed session.

### Out of scope for MVP

- Social features (sharing, leaderboards)
- AI-based plan generation
- Wearable/health kit integration
- Paid tiers or in-app purchases
- Web client

## Core Features

### 1. Exercise Management

| Capability | Detail |
|---|---|
| Browse exercises | List with category filter and text search |
| Create exercise | Name, optional description, category selection |
| Edit exercise | Update any field |
| Delete exercise | Soft-blocked if exercise is used in a plan |
| Exercise images | Upload images via presigned S3 URL |

**Categories** are system-defined: back, chest, triceps, biceps, shoulders, legs, abs, cardio.

### 2. Workout Plan Builder

| Capability | Detail |
|---|---|
| Create plan | Name + ordered list of exercises |
| Configure exercises | Target sets (1-20), target reps (1-100), rest seconds (0-600), optional notes |
| Reorder exercises | Drag-to-reorder on mobile |
| Edit plan | Update name, add/remove/reorder exercises |
| Delete plan | Cascade deletes plan exercises |

**Defaults**: 3 sets, 10 reps, 90 seconds rest.

### 3. Live Workout Execution

| Capability | Detail |
|---|---|
| Start workout | Creates an `in_progress` instance from a plan |
| Log set | Record weight (nullable for bodyweight), reps completed, optional notes |
| Skip set | Mark a set as skipped (injury, fatigue) |
| Rest timer | Countdown timer between sets based on plan config |
| Complete workout | Transition to `completed` status with optional session notes |
| Abandon workout | Transition to `abandoned` status (partial data preserved) |
| Crash recovery | Zustand persisted state restores active workout on app reopen |

**Constraint**: Only one `in_progress` workout per user at a time.

### 4. History and Progress

| Capability | Detail |
|---|---|
| Workout history | Paginated list of completed/abandoned sessions |
| Session detail | Full breakdown of every set logged in a session |
| Exercise history | Per-exercise volume over time |
| Personal records | Max weight, max reps, max volume per exercise |

## Non-Functional Requirements

| Requirement | Target |
|---|---|
| Platform | Android + iOS via Expo React Native |
| Offline tolerance | Live workout should not lose data on brief network drops |
| Auth | Email/password with JWT tokens |
| API latency | < 200ms p95 for CRUD operations |
| Image storage | S3-compatible object store with presigned uploads |

## Success Metrics

- User can go from install to first completed workout in under 5 minutes (with seeded data).
- Zero data loss during live workout execution.
- App startup to interactive in under 2 seconds on mid-range devices.

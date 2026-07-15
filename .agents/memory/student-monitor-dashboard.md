---
name: Student Monitor Dashboard
description: Comprehensive per-student admin monitoring dashboard — what it is, how it's built, and key design decisions.
---

## What it is
A split-panel admin dashboard for monitoring every student's activity in detail.

## Backend: `artifacts/api-server/src/routes/v4_admin_student_monitor.ts`
Two endpoints:
- `GET /v4/admin/student-monitor/students` — paginated list with aggregated stats per student (quiz count, exam passes, lab passes, message count, last active). Supports filters: `search`, `specialty_slug`, `sub_status` (active/expired/free), `date_from`, `date_to`, `sort_by`, `sort_dir`, `page`, `limit`.
- `GET /v4/admin/student-monitor/:userId` — full student detail (user info, subscriptions, v4 paths, all quiz scores joined with quiz tables, exam attempts, lab completions, last 200 AI messages, last 200 activity events, concept mastery stats).

**Why raw SQL**: Used `db.execute(sql.raw(...))` throughout to avoid Drizzle ORM schema mismatches with tables not defined in the workspace DB package.

## Frontend: `artifacts/nukhba/src/components/admin-student-monitor.tsx`
- Left panel: student list with advanced filter sidebar + pagination
- Right panel: selected student detail with 6 tabs: نظرة عامة | الاختبارات | الامتحانات | المختبرات | المحادثات | النشاط
- Registered in `admin.tsx` as tab `value="student-monitor"` (TabsTrigger + TabsContent added after stage-quizzes)

## Registration
- Router imported in `artifacts/api-server/src/routes/index.ts` as `v4AdminStudentMonitorRouter`
- Component imported in `artifacts/nukhba/src/pages/admin.tsx` as `AdminStudentMonitor`

## Key decisions
- Uses `credentials: "include"` on all fetch calls
- Pagination: 30 per page, server-side
- All stats in student list are computed via subqueries in the main SQL (single round-trip)
- Detail endpoint fires 11 parallel queries for all data categories

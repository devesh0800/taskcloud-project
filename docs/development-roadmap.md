# EduSync Implementation Roadmap

This document outlines the phased development plan for the complete **EduSync** platform.

---

## Phase 1: Core Architecture & Scaffolding (Current Phase)
- [x] Establish monorepo structure (`apps/web`, `apps/api`, `docs/`).
- [x] Configure Prisma ORM with Neon PostgreSQL connection pooling.
- [x] Implement local filesystem storage engine (`LocalFileStorageService`) with UUID renaming, MIME validation, and path traversal protection.
- [x] Scaffold partitioned local upload directories (`assignments/`, `submissions/`, `profiles/`, `resources/`).
- [x] Set up Express.js REST API with Helmet, CORS, cookie-parser, and centralized error handling.
- [x] Implement backend health check endpoint (`GET /api/v1/health`).
- [x] Configure Socket.IO server & client infrastructure.
- [x] Initialize Next.js 14 App Router frontend with Tailwind CSS and EduSync design tokens.
- [x] Create reusable shadcn/ui style components (`Button`, `Badge`, `Card`).
- [x] Prepare frontend routes for Teacher, Student, and Admin portals.
- [x] Execute backend automated verification tests.

---

## Phase 2: Database Schema & Authentication Subsystem
- [ ] Connect live Neon PostgreSQL connection string.
- [ ] Run Prisma initial migrations to create tables: `users`, `refresh_tokens`, `classes`, `class_enrollments`, `assignments`, `submissions`, `files`, `notifications`.
- [ ] Implement JWT Access Token and Refresh Token rotation.
- [ ] Implement `POST /api/v1/auth/register` (separate student and teacher registration models).
- [ ] Implement `POST /api/v1/auth/login` with bcrypt verification and cookie session dispatch.
- [ ] Implement `POST /api/v1/auth/refresh-token` and `POST /api/v1/auth/logout`.
- [ ] Wire Next.js client authentication context and protected route middleware.

---

## Phase 3: Teacher Portal & Assignment Publishing
- [ ] Class Management API (`POST /api/v1/classes`, `GET /api/v1/classes`, `DELETE /api/v1/classes/:id`).
- [ ] 6-character unique class code generation and collision handling.
- [ ] Assignment creation with Multer file attachment upload into `uploads/assignments/`.
- [ ] Dynamic assignment states: `DRAFT`, `PUBLISHED`, `ARCHIVED`.
- [ ] Teacher Dashboard UI with class management cards and student enrollment tables.

---

## Phase 4: Student Portal & Assignment Submissions
- [ ] Class enrollment via code (`POST /api/v1/classes/join`).
- [ ] Assignment timeline with deadline countdown and status indicators.
- [ ] Submission upload engine supporting multiple files (PDF, DOCX, PPTX, JPG, PNG, TXT up to 10MB) stored in `uploads/submissions/`.
- [ ] Submission text answer support.
- [ ] Automatic `LATE` submission flagging based on server timestamps.

---

## Phase 5: Evaluation & Grading Workflows
- [ ] Teacher submission evaluation interface with file viewer and download triggers.
- [ ] Grading logic: Marks input, percentage calculation, letter grades (A+, A, B, C, D, F).
- [ ] Written feedback notes and resubmission requests.
- [ ] Student grade view with calculated GPA/average marks.

---

## Phase 6: Real-time Cloud Synchronization & Analytics
- [ ] Socket.IO event rooms for classes, teacher alerts, and student submission notifications.
- [ ] Live notification bell dropdown with unread badges.
- [ ] Recharts performance analytics for teachers (class submission rates, score distribution).
- [ ] Student progress visualization.

---

## Phase 7: Production Hardening & Deployment
- [ ] Rate limiting on authentication and upload endpoints.
- [ ] Audit log for grade modifications.
- [ ] Containerization (Docker and Docker Compose with persistent upload volume).
- [ ] Production build verification and continuous integration checks.

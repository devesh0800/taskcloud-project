# EduSync Architecture Specification

## 1. Executive Summary

**EduSync** is an enterprise-grade, cloud-based educational assignment management and real-time evaluation platform. It bridges the workflow gap between teachers and students through structured assignment publication, file submission handling, automated deadlines, and evaluation workflows.

---

## 2. Monorepo Structural Topology

```
edusync/
├── apps/
│   ├── web/                    # Next.js 14 App Router Frontend
│   │   ├── src/
│   │   │   ├── app/            # App Router pages and route groups
│   │   │   ├── components/     # UI Component library (shadcn/ui style)
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── services/       # Frontend service clients
│   │   │   ├── lib/            # Axios, Socket.IO, utilities
│   │   │   ├── types/          # Shared frontend TypeScript interfaces
│   │   │   └── styles/         # Global styles & Tailwind configuration
│   │   └── package.json
│   │
│   └── api/                    # Express.js REST API & WebSocket Server
│       ├── src/
│       │   ├── config/         # Environment, CORS, Prisma singleton
│       │   ├── controllers/    # Request dispatchers and orchestrators
│       │   ├── middleware/     # Auth, error handling, validation
│       │   ├── routes/         # REST API endpoints (/api/v1/...)
│       │   ├── services/       # Core business logic (User, Class, Assignment, Submission, Grade, Notification)
│       │   ├── sockets/        # Real-time WebSocket handlers (Socket.IO)
│       │   ├── storage/        # Local filesystem storage driver & validations
│       │   ├── validators/     # Zod schema definitions
│       │   ├── utils/          # Token helpers, password utilities, Prisma error parser
│       │   └── server.ts       # Application entry point
│       ├── prisma/
│       │   ├── schema.prisma   # Neon PostgreSQL schema
│       │   ├── migrations/     # Version-controlled SQL migrations
│       │   └── seed.ts         # Development-only database seed script
│       ├── uploads/            # Server filesystem storage partitions
│       │   ├── assignments/    # Reference files uploaded by teachers
│       │   ├── submissions/    # Homework/project files uploaded by students
│       │   ├── profiles/       # User profile avatars
│       │   └── resources/      # Global course resources
│       ├── tests/              # Backend validation & test suites
│       ├── .env.example
│       └── package.json
│
├── docs/                       # Technical architecture & roadmaps
│   ├── architecture.md
│   └── development-roadmap.md
│
├── .gitignore
└── README.md
```

---

## 3. Technology Stack & Architectural Decision Records (ADRs)

### 3.1 Frontend: Next.js (App Router) & Tailwind CSS
- **Framework**: Next.js 14 with TypeScript.
- **Routing**: Next.js App Router for server-side layouts, client interactivity, and streaming.
- **Styling**: Tailwind CSS with custom design tokens matching the EduSync brand:
  - Navy Blue: `#172554`
  - Primary Blue: `#2563EB`
  - Purple Accent: `#7C3AED`
  - Background: `#F8FAFC`
  - Typography Text: `#0F172A`
- **Component Architecture**: Reusable UI primitives (`Button`, `Card`, `Badge`) modeled after shadcn/ui.
- **Networking**: Axios instance with centralized baseURL and credentials support for HTTP cookies.
- **Real-Time Client**: Socket.IO client configured with WebSocket fallback transport.

### 3.2 Backend: Node.js & Express.js
- **Runtime**: Node.js (v20+ LTS).
- **Web Framework**: Express.js with TypeScript (`tsx` for dev, `tsc` for production).
- **Protocol**: HTTP/1.1 REST API + WebSocket bi-directional event bus via Socket.IO.
- **Security Middleware**:
  - `helmet`: Hardens HTTP headers against MIME sniffing, clickjacking, and XSS.
  - `cors`: Strict origin validation allowing only authorized frontend hosts.
  - `cookie-parser`: Secure HTTP-only cookie extraction.

### 3.3 Database: Neon PostgreSQL & Prisma ORM
- **Provider**: [Neon](https://neon.tech/) Serverless PostgreSQL.
- **Data Access Layer**: Prisma ORM with singleton client pattern (`src/config/prisma.ts`).
- **Dual-URL Connection Strategy**:
  - `DATABASE_URL`: Utilizes Neon PgBouncer connection pooling (`&pgbouncer=true`) for sub-millisecond connection reuse across concurrent requests.
  - `DIRECT_URL`: Direct PostgreSQL connection string dedicated to Prisma CLI schema migrations.
- **Data Hygiene**: Relational PostgreSQL database stores **strictly structured metadata and relative file paths**. Binary file data is **never** stored inside PostgreSQL.

---

## 4. Database Schema & Entity Relationships (Phase 2)

### 4.1 Models
1. **`User`** (`users`):
   - Persona accounts for `TEACHER`, `STUDENT`, and `ADMIN`.
   - Fields: `id`, `fullName`, `email` (unique), `passwordHash`, `role`, `isActive`, `emailVerified`, `studentId`, `teacherId`, `department`, `course`, `semester`, `section`, `createdAt`, `updatedAt`.
   - Indexes on `email` and `role`.
2. **`Class`** (`classes`):
   - Created by teachers with unique 6-character joining codes (`classCode`).
   - Fields: `id`, `name`, `description`, `classCode` (unique), `teacherId`, `createdAt`, `updatedAt`.
   - Relation: `teacher` (`onDelete: Restrict`) — prevents teacher deletion if active classes exist.
3. **`ClassMember`** (`class_members`):
   - Join table between students and classes.
   - Enforces `@@unique([classId, studentId])` to prevent duplicate enrollments.
4. **`Assignment`** (`assignments`):
   - Course tasks with instructions, deadlines, total marks, and lifecycle status (`DRAFT`, `PUBLISHED`, `CLOSED`).
   - Relation: `teacher` (`onDelete: Restrict`), `class` (`onDelete: Cascade`).
5. **`AssignmentAttachment`** (`assignment_attachments`):
   - Reference files uploaded by teachers for a specific assignment.
   - Cascades on assignment deletion (`onDelete: Cascade`).
6. **`Submission`** (`submissions`):
   - Student work records.
   - Enforces `@@unique([assignmentId, studentId])` — one submission per student per assignment.
   - Lifecycle status: `SUBMITTED`, `LATE`, `UNDER_REVIEW`, `EVALUATED`, `RESUBMISSION_REQUIRED`.
7. **`SubmissionFile`** (`submission_files`):
   - File deliverables attached by students to a submission.
8. **`Grade`** (`grades`):
   - Evaluation records awarded by teachers.
   - Supports **grading history** (multiple grading events per submission) rather than overwriting past marks.
9. **`Notification`** (`notifications`):
   - In-app notification events for assignment releases, submissions, and grades.
10. **`ActivityLog`** (`activity_logs`):
    - Platform audit trail with `userId`, `action`, `entityType`, `entityId`, and `metadata` (JSON).
    - `onDelete: SetNull` ensures logs remain even if a user account is removed.
11. **`RefreshToken`** (`refresh_tokens`):
    - Session tracking for JWT refresh token rotation.

---

## 5. Local File Storage Subsystem

- **No Third-Party Blobs**: No AWS S3, Supabase Storage, or Cloudinary.
- **Storage Path**: Partitioned local filesystem (`apps/api/uploads/`).
- **Security Validation**:
  - Multi-part form parsing with Multer memory buffer.
  - Whitelist: PDF, DOC, DOCX, PPT, PPTX, TXT, JPG, JPEG, PNG (max 10 MB).
  - Executable/script formats (`.exe`, `.sh`, `.bat`, `.js`, etc.) blocked.
  - Path traversal defense (`path.resolve` boundary verification).
  - UUIDv4 unique naming prevents collisions.
  - Downloaded exclusively via authenticated backend endpoint (`/api/v1/files/download/:category/:fileName`).

---

## 6. Migration & Seed Operations

- **Generate & Run Migrations**:
  ```bash
  cd apps/api
  npx prisma migrate dev --name <migration_name>
  ```
- **Apply Migrations in CI/Production**:
  ```bash
  cd apps/api
  npx prisma migrate deploy
  ```
- **Seed Development Data**:
  ```bash
  cd apps/api
  npm run prisma:seed
  ```
  *(Production guard: Aborts immediately if `NODE_ENV=production`)*

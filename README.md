# TASKCLOUD PROJECT 


# EduSync — Cloud-Based Student-Teacher Assignment & Evaluation Platform

**EduSync** is a modern, full-stack educational management platform designed to simplify assignment distribution, student submissions, teacher evaluation, and academic performance tracking.

The platform provides dedicated dashboards for Teachers, Students, and Administrators, with centralized database management, real-time notifications, and local filesystem-based file storage.

---

## 1. Project Overview

EduSync provides a centralized digital environment for academic collaboration.

### Core Functionalities

- **Teachers:** Create classes, generate joining codes, publish assignments, upload reference materials, review submissions, evaluate student work, assign grades, and provide feedback.
- **Students:** Join classes using unique codes, access assignments, upload multiple solution files, submit text responses, track submission status, and view published grades.
- **Administrators:** Monitor registered users, classes, and overall platform activity.
- **Real-Time Synchronization:** Deliver assignment, submission, grading, and notification updates using Socket.IO.
- **Cloud Database:** Neon PostgreSQL with Prisma ORM for relational data persistence.
- **Local File Storage:** Backend filesystem-based file management without third-party cloud storage providers.

---

## 2. Technology Stack

### Frontend — `apps/web`

| Technology | Purpose |
|---|---|
| Next.js 14 | React application framework |
| React.js | Component-based UI |
| TypeScript | Type-safe development |
| Tailwind CSS | Styling and responsive layouts |
| shadcn/ui | Reusable UI components |
| Lucide React | Icons |
| Axios | HTTP client and API communication |
| Socket.IO Client | Real-time communication |

**Design System:**
- Navy: `#172554`
- Blue: `#2563EB`
- Purple: `#7C3AED`
- Background: `#F8FAFC`

### Backend — `apps/api`

| Technology | Purpose |
|---|---|
| Node.js | Backend runtime |
| Express.js | REST API framework |
| TypeScript | Backend development |
| Prisma ORM | Database operations |
| Neon PostgreSQL | Cloud relational database |
| Socket.IO | Real-time server |
| JWT | Authentication |
| bcrypt | Password hashing |
| Helmet | HTTP security headers |
| CORS | Cross-origin configuration |
| Cookie-Parser | Cookie handling |
| Multer | File upload processing |
| Zod | Request validation |

### File Storage — Local Filesystem

**Storage Location:** `apps/api/uploads/`

```text
uploads/
├── assignments/
├── submissions/
├── profiles/
└── resources/
```

**Storage Policy:**
- Files are stored on the backend server.
- Unique filenames are generated for uploaded files.
- File metadata is maintained in PostgreSQL.
- Private files are accessed through authenticated APIs.
- Maximum file size: 10 MB per file.
- No AWS S3, Firebase Storage, Supabase Storage, or Cloudinary integration.

---

## 3. System Architecture

EduSync follows a client-server architecture with separate frontend, backend, database, real-time communication, and file storage layers.

```text
                   USERS
          +----------+----------+
          |          |          |
        Student    Teacher     Admin
          |          |          |
          +----------+----------+
                     |
                     v
             NEXT.JS FRONTEND
              React + TypeScript
                     |
              REST API / HTTP
                     |
                     v
             EXPRESS BACKEND
                Node.js
                     |
          +----------+----------+
          |          |          |
          v          v          v
       PRISMA     SOCKET.IO   FILE SYSTEM
          |       REAL-TIME    STORAGE
          v
     NEON POSTGRESQL
```

### Architecture Responsibilities

1. **Frontend:** User interface, dashboards, forms, analytics, and navigation.
2. **Backend:** Business logic, authentication, authorization, and API handling.
3. **Prisma ORM:** Database queries and relational data management.
4. **Neon PostgreSQL:** Persistent application data.
5. **Socket.IO:** Real-time notifications and synchronization.
6. **Local Filesystem:** Assignment attachments and student submission files.

---

## 4. Project Directory Structure

```text
edusync/
│
├── apps/
│   │
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── services/
│   │   ├── types/
│   │   └── public/
│   │
│   └── api/
│       ├── src/
│       │   ├── config/
│       │   │   └── prisma.ts
│       │   ├── controllers/
│       │   ├── middleware/
│       │   ├── routes/
│       │   ├── services/
│       │   ├── modules/
│       │   ├── sockets/
│       │   ├── storage/
│       │   ├── validators/
│       │   └── utils/
│       │
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       │
│       ├── uploads/
│       │   ├── assignments/
│       │   ├── submissions/
│       │   ├── profiles/
│       │   └── resources/
│       │
│       ├── tests/
│       └── package.json
│
├── docs/
├── run-edusync.bat
├── .gitignore
└── README.md
```

*Note: The directory structure represents the planned organization. Update it to match the actual implementation.*

---

## 5. Database Models & Schema

**Database:** Neon Serverless PostgreSQL

**ORM:** Prisma

The application uses relational database models to manage users, academic activities, submissions, and notifications.

| Model | Description |
|---|---|
| `User` | Stores teacher, student, and admin account information. |
| `Class` | Stores teacher-owned class information and joining codes. |
| `ClassMember` | Manages student enrollment in classes. |
| `Assignment` | Stores assignment descriptions, deadlines, marks, and status. |
| `AssignmentAttachment` | Stores teacher-uploaded reference file metadata. |
| `Submission` | Stores student assignment submissions. |
| `SubmissionFile` | Stores metadata for uploaded student files. |
| `Grade` | Stores marks, letter grades, and teacher feedback. |
| `Notification` | Stores user notifications and read status. |
| `ActivityLog` | Records relevant platform activities. |
| `RefreshToken` | Manages user refresh-token sessions. |

### Important Database Constraints

- Unique user email addresses.
- Unique class joining codes.
- Unique student membership per class.
- Unique submission per assignment and student, with resubmission handled through the existing submission workflow.
- Appropriate foreign-key relationships.
- Database indexes for frequently queried records.

### Database Connection

The application uses two database connection variables:

- `DATABASE_URL` — Pooled connection for application runtime.
- `DIRECT_URL` — Direct connection for database migrations, where supported by the Prisma configuration.

---

## 6. Environment Configuration

### Backend — `apps/api/.env`

```env
PORT=5000
NODE_ENV=development

# Neon PostgreSQL
DATABASE_URL="YOUR_NEON_POOLED_CONNECTION_STRING"
DIRECT_URL="YOUR_NEON_DIRECT_CONNECTION_STRING"

# Authentication
JWT_ACCESS_SECRET="YOUR_ACCESS_SECRET"
JWT_REFRESH_SECRET="YOUR_REFRESH_SECRET"

# Frontend URL
FRONTEND_URL="http://localhost:3000"

# File Storage
UPLOAD_DIR="uploads"
MAX_FILE_SIZE=10485760
```

### Frontend — `apps/web/.env.local`

```env
NEXT_PUBLIC_API_URL="http://localhost:5000/api/v1"
NEXT_PUBLIC_SOCKET_URL="http://localhost:5000"
```

**Important:**
- Never commit `.env` or `.env.local` files.
- Never expose database credentials or JWT secrets.
- Configure production environment variables separately.
- Keep `.env.example` files updated with placeholders.

---

## 7. Database Setup & Commands

### Navigate to Backend

```bash
cd apps/api
```

### Generate Prisma Client

```bash
npx prisma generate
```

### Create Development Migration

```bash
npx prisma migrate dev --name init
```

### Apply Production Migrations

```bash
npx prisma migrate deploy
```

### Open Prisma Studio

```bash
npx prisma studio
```

### Seed Development Data

If the project's seed script is configured:

```bash
npm run prisma:seed
```

Development seed data must never be used as production credentials.

---

## 8. Running the Application

### Option 1: Windows One-Click Launch

Run the following file from the project root:

```text
run-edusync.bat
```

This should start the frontend and backend development servers if the launch script is configured accordingly.

### Option 2: Manual Launch

**Terminal 1 — Backend**

```bash
cd apps/api
npm install
npm run dev
```

Backend:

```text
http://localhost:5000
```

**Terminal 2 — Frontend**

```bash
cd apps/web
npm install
npm run dev
```

Frontend:

```text
http://localhost:3000
```

### Backend Health Check

```http
GET http://localhost:5000/api/v1/health
```

Expected response should indicate that the backend service is running.

---

## 9. Application Modules

### 9.1 Authentication Module

- Student and teacher registration.
- Login and logout.
- JWT-based authentication.
- Password hashing.
- Forgot and reset password.
- Role-based access control.
- Protected application routes.

### 9.2 Class Management Module

- Create and manage classes.
- Generate unique joining codes.
- Join classes using joining codes.
- View enrolled students.
- Manage class memberships.

### 9.3 Assignment Management Module

- Create and edit assignments.
- Add descriptions and instructions.
- Configure deadlines and maximum marks.
- Upload reference documents.
- Publish and close assignments.
- Manage assignment visibility.

### 9.4 Student Submission Module

- View published assignments.
- Submit text responses.
- Upload multiple files.
- Track submission status.
- Support permitted resubmissions.
- Maintain submission history.

### 9.5 Evaluation and Grading Module

- Review student submissions.
- Download submitted files.
- Assign marks and grades.
- Provide written feedback.
- Publish evaluation results.
- Preserve grading history.

### 9.6 Real-Time Notification Module

- Assignment publication notifications.
- New submission notifications.
- Grade publication notifications.
- Resubmission request notifications.
- Read/unread notification tracking.
- Real-time updates using Socket.IO.

### 9.7 Analytics and Reports Module

- Teacher performance analytics.
- Student academic performance.
- Admin platform analytics.
- Assignment submission statistics.
- Grade distribution.
- CSV report export.
- PDF report generation.

---

## 10. Development Roadmap — 13 Phases

EduSync is planned and developed through the following 13 phases.

| Phase | Module | Development Scope |
|---|---|---|
| 1 | Project Initialization | Monorepo, frontend, backend, TypeScript, and environment setup. |
| 2 | Database Configuration | Neon PostgreSQL, Prisma ORM, schema, and migrations. |
| 3 | Authentication | Registration, login, JWT, password management, and RBAC. |
| 4 | Dashboard Development | Teacher, Student, and Admin dashboards. |
| 5 | Class Management | Class creation, joining codes, and enrollment. |
| 6 | Assignment Management | Assignment creation, publishing, deadlines, and attachments. |
| 7 | Student Submissions | File uploads, text submissions, tracking, and resubmission. |
| 8 | Evaluation and Grading | Marks, grades, feedback, and result publication. |
| 9 | Real-Time Notifications | Socket.IO, event synchronization, and persistent notifications. |
| 10 | Analytics and Reports | Performance charts, CSV exports, and PDF reports. |
| 11 | Basic Security & Optimization | Practical security improvements and performance optimization. |
| 12 | Testing & Bug Fixing | Functional, integration, and regression testing. |
| 13 | Deployment | Production configuration, hosting, and launch. |

### Phase Details

**Phase 1 — Project Initialization**

Establishes the monorepo structure, Next.js frontend, Express backend, TypeScript configuration, and initial API communication.

**Phase 2 — Database Configuration**

Configures Neon PostgreSQL, Prisma ORM, relational models, database constraints, and migrations.

**Phase 3 — Authentication**

Implements registration, login, logout, password management, JWT authentication, and role-based permissions.

**Phase 4 — Dashboard Development**

Creates separate dashboards for Teachers, Students, and Administrators.

**Phase 5 — Class Management**

Implements class creation, joining code generation, student enrollment, and membership management.

**Phase 6 — Assignment Management**

Implements assignment creation, publishing, deadlines, instructions, and reference attachments.

**Phase 7 — Student Submissions**

Implements online submissions, multiple file uploads, submission tracking, and resubmission support.

**Phase 8 — Evaluation and Grading**

Implements teacher evaluation, marks allocation, grade calculation, written feedback, and result publication.

**Phase 9 — Real-Time Synchronization**

Integrates Socket.IO for live assignment, submission, grading, and notification updates.

**Phase 10 — Analytics and Reports**

Implements performance dashboards, statistical charts, CSV exports, and PDF report generation.

**Phase 11 — Basic Security and Optimization**

Improves authentication, API validation, role permissions, file access, and application performance.

**Phase 12 — Testing and Bug Fixing**

Performs end-to-end workflow testing, integration testing, regression testing, and bug fixing.

**Phase 13 — Deployment and Production Launch**

Prepares frontend and backend hosting, production database configuration, persistent local file storage, and deployment verification.

---

## 11. File Upload & Storage Management

The application uses Multer to process incoming uploads and the Node.js filesystem APIs to store files locally.

### Storage Directories

| Directory | Purpose |
|---|---|
| `uploads/assignments/` | Teacher reference documents |
| `uploads/submissions/` | Student assignment files |
| `uploads/profiles/` | User profile images |
| `uploads/resources/` | Shared educational resources |

### Supported File Types

```text
PDF
DOC
DOCX
PPT
PPTX
TXT
JPG
JPEG
PNG
```

### Upload Configuration

```text
Maximum File Size: 10 MB per file
Storage: Local Filesystem
File Naming: Unique Generated Filenames
Database: File Metadata and Relative Paths
```

Uploaded files are not publicly exposed. Access is managed through backend authorization and file download endpoints.

**Production Requirement:** The backend hosting provider must support persistent disk storage. Temporary or ephemeral storage is not suitable for this application.

---

## 12. Security Implementation

EduSync uses practical security controls suitable for an academic management platform.

- bcrypt password hashing.
- JWT-based authentication.
- Role-based access control.
- Helmet security headers.
- CORS configuration.
- API input validation.
- Basic authentication rate limiting.
- File type and size validation.
- Protected file downloads.
- Environment variable protection.
- Backend permission checks.

The system focuses on protecting user accounts and academic records without adding unnecessary authentication complexity.

---

## 13. Testing

The project includes testing across its primary application modules.

### Backend Testing

```bash
cd apps/api
npm test
```

### Database Testing

If the relevant test files and scripts exist:

```bash
npx tsx tests/phase2.test.ts
```

### Functional Testing Checklist

| Test Case | Expected Result |
|---|---|
| Student Registration | Student account is created. |
| Teacher Registration | Teacher account is created. |
| User Login | Authorized user can log in. |
| Class Creation | Teacher can create a class. |
| Class Joining | Student can join using a valid code. |
| Assignment Publishing | Enrolled students can view published assignments. |
| File Upload | Supported files are stored successfully. |
| Submission | Student submission is saved. |
| Evaluation | Teacher can assign marks and feedback. |
| Grade Publication | Student can view published results. |
| Notifications | Relevant users receive notifications. |
| Analytics | Dashboard displays actual database statistics. |
| Report Export | CSV and PDF reports are generated. |

Actual execution results should be recorded separately after running the tests.

---

## 14. Deployment Architecture

The proposed production architecture is:

| Component | Deployment |
|---|---|
| Frontend | Vercel or compatible Next.js hosting |
| Backend | Node.js hosting with persistent disk |
| Database | Neon PostgreSQL |
| ORM | Prisma |
| File Storage | Persistent Local Filesystem |
| Real-Time Communication | Socket.IO |
| Communication | HTTPS |

### Production Requirements

- Configure production environment variables.
- Configure frontend and backend URLs.
- Configure HTTPS and CORS.
- Apply Prisma production migrations.
- Configure persistent upload directories.
- Verify file uploads after backend restarts.
- Test authentication and real-time connections.
- Verify the live application before declaring deployment complete.

---

## 15. Project Status

| Item | Details |
|---|---|
| Project Name | EduSync |
| Project Category | Full-Stack Web Application |
| Domain | Education Technology (EdTech) |
| Frontend | Next.js and TypeScript |
| Backend | Node.js and Express.js |
| Database | Neon PostgreSQL |
| ORM | Prisma |
| Real-Time Communication | Socket.IO |
| File Storage | Local Filesystem |
| Development Roadmap | 13 Phases |

**Phase Completion Status:** Update this section using the actual implementation and testing reports. Do not mark a phase complete solely because its development prompt has been prepared.

---

## 16. Conclusion

EduSync aims to provide an integrated digital environment for managing academic assignments, student submissions, teacher evaluations, and performance tracking.

By combining modern frontend technologies, a Node.js backend, relational database management, real-time communication, and local file storage, the platform provides a structured solution for educational collaboration.

The project demonstrates the practical implementation of full-stack web development, REST APIs, database design, authentication, file handling, real-time communication, and academic data visualization.

**EduSync — Simplifying Academic Collaboration Through Technology.**

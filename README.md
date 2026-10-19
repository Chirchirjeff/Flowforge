# ⬡ FlowForge

**Configurable low-code business workflow management platform.**

Build the workflow platform once, then use it to implement any business process — memo approvals, leave applications, procurement requests, loan processing, contract reviews, and more. The workflow definitions, forms, and approval paths differ; the underlying engine is reusable.

---

## Architecture

```
frontend/   Next.js 16 + React 19 + Tailwind v4      → localhost:3000
backend/    NestJS 12 + Prisma + PostgreSQL            → localhost:4000
```

All API routes are prefixed `/api/v1`.

---

## Quick start

### 1. Clone & install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Set up environment files

```bash
# Backend — copy the example and fill in your DB credentials
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.local.example frontend/.env.local
```

Edit `backend/.env`:
```env
PORT=4000
DATABASE_URL="postgresql://flowforge_user:YOUR_PASSWORD@localhost:5432/flowforge?schema=public"
JWT_SECRET="generate-with: openssl rand -base64 64"
JWT_EXPIRES_IN="8h"
```

### 3. Set up the database (PostgreSQL)

```sql
-- Run in psql as a superuser
CREATE USER flowforge_user WITH PASSWORD 'YOUR_PASSWORD';
CREATE DATABASE flowforge OWNER flowforge_user;
GRANT ALL PRIVILEGES ON DATABASE flowforge TO flowforge_user;
```

### 4. Generate Prisma client & migrate

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
```

> **Note:** The `prisma` CLI package may be slow to install via `npm install --save-dev prisma`. Use `npx prisma` directly — it works without the local binary.

### 5. Start both servers

```bash
# Terminal 1 — Backend
cd backend
npm run start:dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the dashboard login.

### 6. First admin user

The platform seeds default roles on startup. Create your first user via the API until an admin UI is built:

```bash
# Login endpoint (after you create a user in the DB directly or via seed script)
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"yourpassword"}'
```

---

## What's been built

### Backend modules

| Module | Endpoints | Notes |
|---|---|---|
| **Auth** | `POST /auth/login`, `GET /auth/me` | JWT, bcrypt hashing, Passport local+JWT strategies |
| **Users** | `GET/POST/PUT /users`, `POST /users/:id/roles/:roleId` | Full CRUD, role assignment |
| **Roles** | `GET/POST/PUT /roles`, `GET /roles/permissions` | 17 built-in permission keys, 5 default roles seeded on startup |
| **Workflow Definitions** | `GET/POST /workflow-definitions`, `PUT /workflow-definitions/:id` | Draft creation, named versions |
| **Workflow Versions** | `PUT /versions/:id/graph`, `POST /versions/:id/publish`, `POST /:id/versions` | Save canvas graph, publish with validation, create new draft version |
| **Workflow Engine** | (internal) | Kahn topological sort, node execution (start/end/user-task/approval/condition/notification/automated-task), condition evaluation, transactional task creation |
| **Cases** | `GET/POST /cases`, `GET /cases/:id`, `GET /cases/:id/timeline`, `POST /cases/:id/cancel` | Auto case numbers (`FF-2026-000001`), starts workflow instance on creation |
| **Tasks** | `GET /tasks/my`, `GET /tasks/:id`, `POST /tasks/:id/claim`, `POST /tasks/:id/complete`, `POST /tasks/:id/reassign` | Role-based inbox, claim/approve/reject/submit actions |
| **Audit** | `GET /audit-events` | Append-only, paginated, filtered by actor/entity/case/action/date |

### Prisma schema entities

`User` · `Role` · `Permission` · `UserRole` · `RolePermission` · `WorkflowDefinition` · `WorkflowVersion` · `WorkflowInstance` · `WorkflowEvent` · `Case` · `Task` · `FormDefinition` · `AuditEvent`

### Frontend pages

| Route | Description |
|---|---|
| `/login` | JWT login, token stored in localStorage |
| `/dashboard` | Sidebar nav, workflow definitions list, create new |
| `/workflows/[versionId]` | Visual canvas editor (ReactFlow) — drag, connect, configure nodes |
| `/cases` | Cases list with status filter and search |
| `/cases/[id]` | Case detail — metadata, active tasks, timeline |
| `/tasks` | My task inbox — role-based, priority sorted |

---

## Permission keys

| Key | Who has it (default) |
|---|---|
| `workflow.create/edit/publish/delete` | Workflow Designer, Platform Administrator |
| `case.create/read/assign/cancel` | Workflow Officer, Department Manager |
| `task.complete/claim` | Workflow Officer |
| `task.reassign` | Department Manager |
| `document.upload/download` | Workflow Officer |
| `audit.read` | Auditor |
| `user.manage` | Platform Administrator |
| `role.manage` | Platform Administrator |
| `report.view` | Department Manager, Auditor |

---

## Default roles (seeded on startup)

| Role | Permissions |
|---|---|
| **Platform Administrator** | All permissions |
| **Workflow Designer** | workflow.create/edit/publish |
| **Workflow Officer** | case.create/read, task.complete/claim, document.upload |
| **Department Manager** | case.read/assign, task.reassign, report.view |
| **Auditor** | audit.read, case.read, report.view |

---

## Workflow node types (canvas)

| Type | Category | Description |
|---|---|---|
| `start` | Trigger | Entry point — exactly one per workflow |
| `end` | Control | Terminates a path — at least one required |
| `user-task` | Action | Assigns work to a user/role and waits |
| `approval` | Action | Collects approve/reject decision |
| `condition` | Logic | Branches on a configured condition expression |
| `notification` | Action | Queues a notification (delivery via future notification service) |
| `automated-task` | Action | Executes a system operation (integration adapter) |

---

## Database setup (for reference)

After running `npx prisma generate` and `npx prisma migrate dev --name init`, the schema creates all tables with:

- UUID primary keys
- Foreign key constraints with cascade deletes where appropriate
- Enum types for statuses (`VersionStatus`, `InstanceStatus`, `CaseStatus`, `TaskStatus`)
- Indexed columns for performance (`assignedToId`, `caseId`, `entityType+entityId`)

---

## Development commands

```bash
# Backend
npm run start:dev     # watch mode
npm run build         # compile
npm run test          # vitest unit tests
npm run test:e2e      # e2e via supertest
npm run lint          # oxlint

# Frontend
npm run dev           # Next.js dev server (Turbopack)
npm run build         # production build
npm run lint          # eslint
```

---

## Project structure

```
Flowforge/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma         ← All database models
│   ├── src/
│   │   ├── auth/                 ← JWT + Passport strategies
│   │   ├── users/                ← User CRUD + role assignment
│   │   ├── roles/                ← Roles + permissions + RBAC guard
│   │   ├── prisma/               ← PrismaService (global)
│   │   ├── workflow-definitions/ ← Definition CRUD + versioning
│   │   ├── workflow-engine/      ← Execution engine
│   │   ├── cases/                ← Case management
│   │   ├── tasks/                ← Task inbox + actions
│   │   ├── audit/                ← Append-only audit log
│   │   └── common/
│   │       ├── guards/           ← PermissionsGuard
│   │       └── decorators/       ← @RequirePermissions, @CurrentUser
│   └── .env.example
│
├── frontend/
│   ├── app/
│   │   ├── login/                ← Auth page
│   │   ├── dashboard/            ← Workflow definitions + nav
│   │   ├── workflows/[id]/       ← Canvas editor
│   │   ├── cases/                ← Cases list
│   │   ├── cases/[id]/           ← Case detail + timeline
│   │   └── tasks/                ← Task inbox
│   ├── components/canvas/        ← ReactFlow canvas components
│   ├── context/AuthContext.tsx   ← JWT auth context
│   ├── lib/api.ts                ← Typed API client
│   ├── lib/types.ts              ← Shared type definitions
│   ├── store/workflow-store.ts   ← Zustand canvas state
│   └── .env.local.example
│
├── FlowForge.pdf                 ← Technical specification
└── README.md                     ← This file
```

---

## Theme system

FlowForge supports light and dark mode with a toggle in every page header.

- The toggle button (sun/moon icon) lives in the **topbar** of every page and in the **canvas toolbar**.
- Your preference is saved to `localStorage` under `ff_theme`.
- On first load, the system preference (`prefers-color-scheme`) is used as the default.
- Theme is applied by adding `.light` or `.dark` to `<html>` — all colours are CSS custom properties defined in `globals.css`.

---

## Admin section

Available to users with `user.manage` permission (Platform Administrator by default).
Navigate via the **Administration** section in the sidebar.

| Route | Description |
|---|---|
| `/admin/users` | List all users, create new accounts, activate/deactivate, assign roles |
| `/admin/roles` | List roles with expandable permission sets, create custom roles |
| `/admin/audit` | Paginated audit log with action/entity-type/date filters |

### Creating a custom role

1. Go to **Admin → Roles**
2. Click **New Role**
3. Enter a name and select permissions from the grouped checklist
4. Save — the role is immediately available for assignment

### Assigning a role to a user

1. Go to **Admin → Users**
2. Click the shield icon (🛡) on a user row
3. Click an unassigned role to assign it — a checkmark confirms assignment

---

## What comes next (per spec)

- **Phase 4 — Forms engine**: Configurable form schemas, field types, validation, form submissions stored per case
- **Phase 5 — Notifications**: Email + in-app notifications triggered by workflow events
- **Phase 6 — Documents**: File upload/download with metadata in Postgres, object storage integration
- **Phase 7 — Reporting**: Operational dashboards, case metrics, overdue task tracking
- **Phase 8 — Admin UI**: User management, role editor, permission matrix in the frontend

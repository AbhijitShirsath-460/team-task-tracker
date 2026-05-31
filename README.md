# Team Task Tracker API

A production-ready REST API for team-based task management with JWT authentication, role-based access control, Redis caching, and fully containerized deployment.

---

## 🚀 Quick Start

**Prerequisite**: Docker and Docker Compose installed.

```bash
git clone <your-repo-url>
cd team-task-tracker
docker compose up --build
```

The API will be available at:
* **Docker Container**: [http://localhost:8080](http://localhost:8080)
* **Local Dev Server**: [http://localhost:3000](http://localhost:3000)

**That's it. No manual setup required.**

---

## 📚 API Documentation

Once the server is running, the interactive API documentation is available at:
* **Swagger UI (Docker)**: [http://localhost:8080/api/docs](http://localhost:8080/api/docs)
* **Swagger UI (Local)**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
* **Health Check**: `/health` (e.g. [http://localhost:8080/health](http://localhost:8080/health))
* **Postman Collection**: `docs/TaskTracker.postman_collection.json`

### Default Seed Credentials

| Role | Email | Password |
|---|---|---|
| ADMIN | admin@democorp.com | Admin@1234 |
| MANAGER | manager@democorp.com | Manager@1234 |
| MEMBER | member@democorp.com | Member@1234 |

---

## 🔐 Authentication

All protected endpoints require:
```
Authorization: Bearer <access_token>
```

- **Access Token**: 15 minutes expiry — send in `Authorization` header
- **Refresh Token**: 7 days expiry — stored in HTTP-only cookie, rotated on each use

### Token Rotation (RTR)
On `POST /api/v1/auth/refresh`:
1. Old refresh token is verified and deleted
2. A brand new pair (access + refresh) is issued
3. If a used/revoked token is submitted → **all sessions for that user are revoked** (breach detection)

---

## 👤 Roles & Permissions

| Action | ADMIN | MANAGER | MEMBER |
|---|---|---|---|
| Manage users (invite/delete/role) | ✅ | ❌ | ❌ |
| Create/delete projects | ✅ | ✅ | ❌ |
| Delete projects | ✅ | ❌ | ❌ |
| Create/delete tasks | ✅ | ✅ | ❌ |
| Update task metadata | ✅ | ✅ | ❌ |
| Update task status | ✅ (any) | ✅ (any) | ✅ (own tasks only) |
| View tasks | ✅ (all) | ✅ (all) | ✅ (assigned only) |
| Analytics | ✅ | ✅ | ❌ |

**RBAC is enforced at the middleware layer — not inside controller logic.**

---

## 📋 Task Status Transitions

```
TODO → IN_PROGRESS → IN_REVIEW → DONE
  ↘          ↘           ↘
           BLOCKED (reachable from any active state)
BLOCKED → TODO | IN_PROGRESS | IN_REVIEW

DONE = terminal state (no transitions out)
```

Only the **assigned user** or a **MANAGER/ADMIN** can change a task's status.

---

## 🗄️ Database Design Decision

### Decision 1: RefreshToken stored in PostgreSQL, not Redis

We store refresh tokens in the database instead of Redis for two reasons:

1. **Token Rotation Detection**: If a previously-used token is submitted again, we detect the reuse (it won't be in DB anymore) and revoke ALL sessions for that user — a critical security countermeasure.
2. **Persistence**: Redis is volatile. If Redis restarts, all sessions would be destroyed. DB-stored tokens survive Redis restarts.

### Decision 2: `completedAt` field on Task

Tasks have a `completedAt` timestamp that is auto-set server-side when status transitions to `DONE`. This field is never user-settable. It powers the analytics endpoint (avg completion time = `completedAt - createdAt`).

### Decision 3: Indexes

| Index | Field(s) | Reason |
|---|---|---|
| Task | `status` | Task board filtering by state |
| Task | `assigneeId` | Per-user task queries + cache keys |
| Task | `dueDate` | Overdue detection + sorting |
| Task | `projectId + status` | Project board scoped queries |
| User | `organizationId` | Every query is org-scoped |
| RefreshToken | `userId` | Fast token lookup per user during rotation |

---

## ⚡ Caching Strategy

**What is cached**: Task list responses, keyed per organization + assignee + pagination + filters.

**Cache Key Pattern**:
```
tasks:org:{orgId}:assignee:{assigneeId}:page:{page}:limit:{limit}:status:{status}:priority:{priority}
```

**Cache TTL**: 1 hour (3600 seconds)

**Invalidation Strategy**: Redis Set-based tracking
- Every cache key is added to a Redis Set: `user:cachekeys:{assigneeId}`
- On any write (create/update/delete task):
  1. `SMEMBERS user:cachekeys:{assigneeId}` — get all cached keys for that user
  2. `DEL` each key
  3. `DEL user:cachekeys:{assigneeId}` — clear the tracking set
- If assignee changes, both old and new assignee caches are invalidated

**Why not SCAN/KEYS?** `KEYS *` and `SCAN` block the Redis server and are unsafe in production. The Set-based approach gives O(1) lookup with no server-blocking operations.

---

## 🌍 Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description | Default |
|---|---|---|
| `PORT` | API port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `DATABASE_URL` | PostgreSQL connection string | — |
| `REDIS_URL` | Redis connection string | — |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens | — |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens | — |
| `JWT_ACCESS_EXPIRES_IN` | Access token expiry | `15m` |
| `JWT_REFRESH_EXPIRES_DAYS` | Refresh token expiry in days | `7` |

---

## 🧪 Running Tests

```bash
# Requires a running PostgreSQL + Redis
npm test
```

Tests cover:
1. **Auth flow**: Register, login, duplicate detection, invalid credentials
2. **RBAC enforcement**: MEMBER blocked from creating tasks, ADMIN permitted
3. **Status transitions**: Valid path, invalid jump (IN_PROGRESS→DONE), terminal state (DONE→anything)

---

## 🔧 Local Development (without Docker)

```bash
npm install
cp .env.example .env          # Edit .env with your local DB/Redis URLs
npx prisma migrate dev        # Run migrations
node prisma/seed.js           # Seed test data
npm run dev                   # Start with nodemon
```

---

## 📈 Bonus Features

- **Analytics**: `GET /api/v1/analytics/overdue` — overdue task count per user + avg completion time
- **Swagger UI**: Full interactive API explorer at `/api/docs`

---

## 🚧 What I Would Improve Given More Time

1. **Rate limiting** — Add `express-rate-limit` on auth routes (register/login) to prevent brute force
2. **Email verification** — Email confirmation flow on registration using SendGrid/SES
3. **Cursor-based pagination** — Replace offset pagination with cursor-based for large datasets
4. **WebSocket/SSE notifications** — Real-time status change notifications for task assignees
5. **Soft deletes** — Archive users/tasks instead of hard delete for audit trail
6. **Role-level query caching** — Currently cache is per-assignee; could extend to org-level for ADMIN/MANAGER
7. **CI/CD pipeline** — GitHub Actions for automated test + lint on every PR

---

## 🏗️ Project Structure

```
src/
├── config/        ← DB, Redis, environment config
├── constants/     ← Roles, statuses, transition map, error codes
├── middlewares/   ← Auth, RBAC, Validation, Error handler
├── modules/       ← auth | users | projects | tasks | analytics
├── utils/         ← AppError, asyncHandler, logger, JWT, hash, cache
├── app.js         ← Express app setup
└── server.js      ← Server startup + graceful shutdown
```

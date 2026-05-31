require('./helpers/testSetup');

const request = require('supertest');
const app     = require('../src/app');
const prisma  = require('../src/config/db');

// ── Test data setup ───────────────────────────────────────────
const SUFFIX = Date.now();
let orgId, adminToken, managerToken, memberToken, projectId;

beforeAll(async () => {
  // Register org + ADMIN
  const adminReg = await request(app)
    .post('/api/v1/auth/register')
    .send({
      orgName: `RBAC Corp ${SUFFIX}`,
      firstName: 'Admin', lastName: 'User',
      email: `rbac_admin_${SUFFIX}@test.com`,
      password: 'Admin@1234',
    });
  orgId = adminReg.body.data.organization.id;

  const adminLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: `rbac_admin_${SUFFIX}@test.com`, password: 'Admin@1234' });
  adminToken = adminLogin.body.data.accessToken;

  // ADMIN invites MANAGER
  await request(app)
    .post('/api/v1/users/invite')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ firstName: 'Mgr', lastName: 'User', email: `rbac_mgr_${SUFFIX}@test.com`, password: 'Mgr@1234', role: 'MANAGER' });

  const mgrLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: `rbac_mgr_${SUFFIX}@test.com`, password: 'Mgr@1234' });
  managerToken = mgrLogin.body.data.accessToken;

  // ADMIN invites MEMBER
  await request(app)
    .post('/api/v1/users/invite')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ firstName: 'Mem', lastName: 'User', email: `rbac_mem_${SUFFIX}@test.com`, password: 'Mem@1234', role: 'MEMBER' });

  const memLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: `rbac_mem_${SUFFIX}@test.com`, password: 'Mem@1234' });
  memberToken = memLogin.body.data.accessToken;

  // Create a project as ADMIN
  const proj = await request(app)
    .post('/api/v1/projects')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: `RBAC Project ${SUFFIX}` });
  projectId = proj.body.data.id;
});

afterAll(async () => {
  // Since relations do not have cascade delete, delete children first
  const orgs = await prisma.organization.findMany({
    where: { name: { contains: `RBAC Corp ${SUFFIX}` } },
    select: { id: true },
  });
  const orgIds = orgs.map(o => o.id);

  if (orgIds.length > 0) {
    await prisma.task.deleteMany({
      where: { project: { organizationId: { in: orgIds } } },
    });
    await prisma.project.deleteMany({
      where: { organizationId: { in: orgIds } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { organizationId: { in: orgIds } } },
    });
    await prisma.user.deleteMany({
      where: { organizationId: { in: orgIds } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: orgIds } },
    });
  }
  await prisma.$disconnect();
});

// ── Test Flow 1: RBAC — MEMBER cannot create tasks ───────────
describe('RBAC: Task creation restrictions', () => {
  it('ADMIN can create a task', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Admin Task', projectId, priority: 'HIGH' });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Admin Task');
  });

  it('MANAGER can create a task', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ title: 'Manager Task', projectId, priority: 'MEDIUM' });

    expect(res.status).toBe(201);
  });

  it('MEMBER cannot create a task — should return 403 AUTHORIZATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ title: 'Member Task', projectId });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('AUTHORIZATION_ERROR');
  });

  it('MEMBER cannot delete a task — should return 403', async () => {
    // First get any task
    const tasks = await request(app)
      .get('/api/v1/tasks')
      .set('Authorization', `Bearer ${adminToken}`);

    if (tasks.body.data.length > 0) {
      const taskId = tasks.body.data[0].id;
      const res = await request(app)
        .delete(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(res.status).toBe(403);
    }
  });
});

// ── Test Flow 2: Status Transition Enforcement ────────────────
describe('Status Transition: enforced server-side', () => {
  let taskId;

  beforeAll(async () => {
    // Create a task in TODO state
    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Transition Test Task', projectId, priority: 'LOW' });
    taskId = res.body.data.id;
  });

  it('should allow TODO → IN_PROGRESS', async () => {
    const res = await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'IN_PROGRESS' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('IN_PROGRESS');
  });

  it('should reject IN_PROGRESS → DONE (invalid transition)', async () => {
    const res = await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DONE' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('should allow IN_PROGRESS → BLOCKED', async () => {
    const res = await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'BLOCKED' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('BLOCKED');
  });

  it('should reject DONE → anything (terminal state)', async () => {
    // Move to DONE first via valid path
    await request(app).patch(`/api/v1/tasks/${taskId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'IN_PROGRESS' });
    await request(app).patch(`/api/v1/tasks/${taskId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'IN_REVIEW' });
    await request(app).patch(`/api/v1/tasks/${taskId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'DONE' });

    const res = await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'TODO' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_STATUS_TRANSITION');
  });
});

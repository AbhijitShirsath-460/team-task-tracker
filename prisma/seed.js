// Idempotent seed — safe to re-run on every docker compose up
// Checks if data exists before inserting to avoid duplicates

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ── 1. Create Organization (skip if exists) ──────────────
  let org = await prisma.organization.findFirst({
    where: { name: 'Demo Corp' },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: { name: 'Demo Corp' },
    });
    console.log('✅ Organization created:', org.name);
  } else {
    console.log('⏭️  Organization already exists, skipping.');
  }

  // ── 2. Create ADMIN user (skip if exists) ────────────────
  const adminEmail = 'admin@democorp.com';
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!admin) {
    const passwordHash = await bcrypt.hash('Admin@1234', 10);
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'ADMIN',
        organizationId: org.id,
      },
    });
    console.log('✅ ADMIN user created:', admin.email);
  } else {
    console.log('⏭️  Admin user already exists, skipping.');
  }

  // ── 3. Create MANAGER user ───────────────────────────────
  const managerEmail = 'manager@democorp.com';
  let manager = await prisma.user.findUnique({ where: { email: managerEmail } });

  if (!manager) {
    const passwordHash = await bcrypt.hash('Manager@1234', 10);
    manager = await prisma.user.create({
      data: {
        email: managerEmail,
        passwordHash,
        firstName: 'Jane',
        lastName: 'Manager',
        role: 'MANAGER',
        organizationId: org.id,
      },
    });
    console.log('✅ MANAGER user created:', manager.email);
  } else {
    console.log('⏭️  Manager user already exists, skipping.');
  }

  // ── 4. Create MEMBER user ────────────────────────────────
  const memberEmail = 'member@democorp.com';
  let member = await prisma.user.findUnique({ where: { email: memberEmail } });

  if (!member) {
    const passwordHash = await bcrypt.hash('Member@1234', 10);
    member = await prisma.user.create({
      data: {
        email: memberEmail,
        passwordHash,
        firstName: 'John',
        lastName: 'Member',
        role: 'MEMBER',
        organizationId: org.id,
      },
    });
    console.log('✅ MEMBER user created:', member.email);
  } else {
    console.log('⏭️  Member user already exists, skipping.');
  }

  // ── 5. Create sample Project ──────────────────────────────
  let project = await prisma.project.findFirst({
    where: { name: 'Demo Project', organizationId: org.id },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        name: 'Demo Project',
        description: 'Sample project for testing',
        organizationId: org.id,
      },
    });
    console.log('✅ Project created:', project.name);
  } else {
    console.log('⏭️  Project already exists, skipping.');
  }

  // ── 6. Create sample Tasks ───────────────────────────────
  const taskCount = await prisma.task.count({ where: { projectId: project.id } });

  if (taskCount === 0) {
    await prisma.task.createMany({
      data: [
        {
          title: 'Setup project repository',
          description: 'Initialize repo and configure CI/CD',
          priority: 'HIGH',
          status: 'DONE',
          assigneeId: member.id,
          creatorId: admin.id,
          projectId: project.id,
          dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
        {
          title: 'Design database schema',
          description: 'Create ER diagram and Prisma schema',
          priority: 'HIGH',
          status: 'IN_PROGRESS',
          assigneeId: member.id,
          creatorId: manager.id,
          projectId: project.id,
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        },
        {
          title: 'Write API documentation',
          description: 'Document all endpoints in Swagger',
          priority: 'MEDIUM',
          status: 'TODO',
          assigneeId: member.id,
          creatorId: manager.id,
          projectId: project.id,
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        },
      ],
    });
    console.log('✅ Sample tasks created.');
  } else {
    console.log('⏭️  Tasks already exist, skipping.');
  }

  console.log('\n🎉 Seed complete!');
  console.log('─────────────────────────────────────────');
  console.log('  Login credentials:');
  console.log('  ADMIN   → admin@democorp.com   / Admin@1234');
  console.log('  MANAGER → manager@democorp.com / Manager@1234');
  console.log('  MEMBER  → member@democorp.com  / Member@1234');
  console.log('─────────────────────────────────────────');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

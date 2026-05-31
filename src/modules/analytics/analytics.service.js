const prisma = require('../../config/db');
const logger  = require('../../utils/logger');

/**
 * Analytics: overdue task count per user + avg completion time.
 *
 * Uses $queryRaw for the aggregation that Prisma's ORM API can't express cleanly
 * (mixing COUNT, AVG, EXTRACT in one query).
 *
 * Only visible to ADMIN and MANAGER (enforced at route level).
 */
const getAnalytics = async (orgId) => {
  // ── 1. Overdue tasks per assignee ────────────────────────
  // Overdue = status NOT DONE and dueDate < NOW
  const overdueRows = await prisma.$queryRaw`
    SELECT
      u.id         AS "userId",
      u."firstName",
      u."lastName",
      u.email,
      COUNT(t.id)::int AS "overdueCount"
    FROM tasks t
    JOIN projects p ON t."projectId" = p.id
    JOIN users u    ON t."assigneeId" = u.id
    WHERE
      p."organizationId" = ${orgId}
      AND t.status NOT IN ('DONE', 'BLOCKED')
      AND t."dueDate" IS NOT NULL
      AND t."dueDate" < NOW()
    GROUP BY u.id, u."firstName", u."lastName", u.email
    ORDER BY "overdueCount" DESC
  `;

  // ── 2. Avg completion time per assignee ───────────────────
  // completedAt - createdAt in hours (only DONE tasks)
  const completionRows = await prisma.$queryRaw`
    SELECT
      u.id AS "userId",
      ROUND(
        AVG(EXTRACT(EPOCH FROM (t."completedAt" - t."createdAt")) / 3600)::numeric,
        2
      ) AS "avgCompletionHours"
    FROM tasks t
    JOIN projects p ON t."projectId" = p.id
    JOIN users u    ON t."assigneeId" = u.id
    WHERE
      p."organizationId" = ${orgId}
      AND t.status = 'DONE'
      AND t."completedAt" IS NOT NULL
    GROUP BY u.id
  `;

  // ── 3. Merge results ─────────────────────────────────────
  const completionMap = {};
  completionRows.forEach((r) => { completionMap[r.userId] = r.avgCompletionHours; });

  const result = overdueRows.map((row) => ({
    userId: row.userId,
    name: `${row.firstName} ${row.lastName}`,
    email: row.email,
    overdueCount: row.overdueCount,
    avgCompletionHours: completionMap[row.userId] || null,
  }));

  logger.info('Analytics query executed', { orgId, resultCount: result.length });
  return result;
};

module.exports = { getAnalytics };

const { Router } = require('express');
const analyticsController = require('./analytics.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize }    = require('../../middlewares/rbac.middleware');

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Analytics and reporting endpoints (ADMIN & MANAGER only)
 */

// ADMIN and MANAGER only — MEMBERs should not see org-wide analytics
router.use(authenticate, authorize('ADMIN', 'MANAGER'));

/**
 * @swagger
 * /analytics/overdue:
 *   get:
 *     summary: Retrieve organization-wide overdue tasks and average completion times
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics report retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     overdueTasksCount:
 *                       type: integer
 *                       example: 5
 *                     averageCompletionTimeHours:
 *                       type: number
 *                       format: float
 *                       example: 18.5
 *                     overdueTasksByUser:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           assigneeId:
 *                             type: string
 *                             format: uuid
 *                           assigneeEmail:
 *                             type: string
 *                           overdueCount:
 *                             type: integer
 *       403:
 *         description: Forbidden (requires ADMIN or MANAGER)
 */
router.get('/overdue', analyticsController.overdue);

module.exports = router;

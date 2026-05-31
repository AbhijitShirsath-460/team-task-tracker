const { Router } = require('express');
const tasksController = require('./tasks.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { createTaskSchema, updateTaskSchema, updateStatusSchema, listQuerySchema } = require('./tasks.validation');

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Task management and transition endpoints
 */

// All task routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: List tasks with filters and pagination
 *     description: |
 *       MEMBERs can only see tasks assigned to themselves.
 *       ADMINs and MANAGERs can view all tasks in their organization and filter them.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED]
 *           default: all
 *         description: Filter by task status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [all, LOW, MEDIUM, HIGH]
 *           default: all
 *         description: Filter by task priority
 *       - in: query
 *         name: assignee
 *         schema:
 *           type: string
 *           default: all
 *         description: Filter by assignee User ID (UUID or 'all')
 *     responses:
 *       200:
 *         description: Tasks list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Task'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get('/',    validate(listQuerySchema, 'query'), tasksController.list);

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Get task details by ID
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The task ID
 *     responses:
 *       200:
 *         description: Task details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       403:
 *         description: Forbidden (MEMBER trying to access another user's task)
 *       404:
 *         description: Task not found
 */
router.get('/:id',                                     tasksController.getOne);

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Create a new task (ADMIN & MANAGER write access)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - projectId
 *             properties:
 *               title:
 *                 type: string
 *                 example: Draft API documentation
 *               description:
 *                 type: string
 *                 example: Complete JSDocs for the user management endpoints.
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH]
 *                 example: HIGH
 *               projectId:
 *                 type: string
 *                 format: uuid
 *                 example: aa9a463a-bb9b-449c-a11c-223cf56db890
 *               assigneeId:
 *                 type: string
 *                 format: uuid
 *                 example: cc9c463a-dd9d-449c-a11c-223cf56db892
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-12-31T23:59:59Z
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 201
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden (requires ADMIN or MANAGER)
 */
router.post('/',    authorize('ADMIN', 'MANAGER'), validate(createTaskSchema),  tasksController.create);

/**
 * @swagger
 * /tasks/{id}:
 *   patch:
 *     summary: Update task metadata (ADMIN & MANAGER write access)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH]
 *               assigneeId:
 *                 type: string
 *                 format: uuid
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Task updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 */
router.patch('/:id', authorize('ADMIN', 'MANAGER'), validate(updateTaskSchema), tasksController.update);

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     summary: Delete a task (ADMIN & MANAGER write access)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The task ID
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Task deleted successfully
 *       404:
 *         description: Task not found
 */
router.delete('/:id', authorize('ADMIN', 'MANAGER'),                            tasksController.remove);

/**
 * @swagger
 * /tasks/{id}/status:
 *   patch:
 *     summary: Advance task status (state machine checked)
 *     description: |
 *       Enforces the server-side state machine. Allowed transitions:
 *       - `TODO` ➔ `IN_PROGRESS` or `BLOCKED`
 *       - `IN_PROGRESS` ➔ `IN_REVIEW` or `BLOCKED`
 *       - `IN_REVIEW` ➔ `DONE` or `BLOCKED`
 *       - `BLOCKED` ➔ `TODO`, `IN_PROGRESS` or `IN_REVIEW`
 *       - `DONE` is terminal and cannot transition out.
 *       MEMBERs can only transition tasks assigned to them. ADMINs and MANAGERs can update any task.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED]
 *                 example: IN_PROGRESS
 *     responses:
 *       200:
 *         description: Task status advanced successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       400:
 *         description: Invalid status transition
 *       403:
 *         description: Forbidden (not the assignee and not ADMIN/MANAGER)
 */
router.patch('/:id/status', validate(updateStatusSchema), tasksController.updateStatus);

module.exports = router;

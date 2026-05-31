const analyticsService = require('./analytics.service');
const asyncHandler = require('../../utils/asyncHandler');

/** GET /api/v1/analytics/overdue */
const overdue = asyncHandler(async (req, res) => {
  const data = await analyticsService.getAnalytics(req.user.organizationId);
  res.status(200).json({ status: 200, data });
});

module.exports = { overdue };

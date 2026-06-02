const express = require('express');

const asyncHandler = require('../utils/async-handler');
const dashboardService = require('../services/dashboard.service');

const router = express.Router();

router.get('/summary', asyncHandler(async function(req, res) {
  const summary = await dashboardService.getSummary();

  res.json(summary);
}));

module.exports = router;

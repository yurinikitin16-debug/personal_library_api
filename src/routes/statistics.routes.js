const express = require('express');

const asyncHandler = require('../utils/async-handler');
const statisticsService = require('../services/statistics.service');

const router = express.Router();

router.get('/', asyncHandler(async function(req, res) {
  const statistics = await statisticsService.getStatistics();

  res.json(statistics);
}));

module.exports = router;

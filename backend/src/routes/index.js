const express = require('express');

const { getHealthStatus } = require('../services/healthService');
const v1Router = require('./v1');

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json(getHealthStatus());
});

router.use('/v1', v1Router);

module.exports = router;

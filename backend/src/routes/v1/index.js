const express = require('express');

const { getHealthStatus, getReadyStatus } = require('../../services/healthService');

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json(getHealthStatus());
});

router.get('/health/ready', (req, res) => {
  const payload = getReadyStatus();
  res.status(payload.ready ? 200 : 503).json(payload);
});

module.exports = router;

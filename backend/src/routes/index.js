const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Workly API is running',
  });
});

router.get('/health/ready', (req, res) => {
  const isReady = mongoose.connection.readyState === 1;

  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'success' : 'error',
    message: isReady ? 'MongoDB connected' : 'MongoDB not connected',
    ready: isReady,
  });
});

module.exports = router;

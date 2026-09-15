const express = require('express');

const { getHealthStatus, getReadyStatus } = require('../../services/healthService');
const authRoutes = require('./auth');
const organizationRoutes = require('./organization');
const memberRoutes = require('./members');
const projectRoutes = require('./projects');
const invitationRoutes = require('./invitations');

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json(getHealthStatus());
});

router.get('/health/ready', (req, res) => {
  const payload = getReadyStatus();
  res.status(payload.ready ? 200 : 503).json(payload);
});

router.use('/auth', authRoutes);
router.use('/organization', organizationRoutes);
router.use('/members', memberRoutes);
router.use('/projects', projectRoutes);
router.use('/invitations', invitationRoutes);

module.exports = router;

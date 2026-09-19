const express = require('express');

const auth = require('../../middleware/auth');
const tenantContext = require('../../middleware/tenantContext');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');

const {
  validateCreateTeam,
  validateUpdateTeam,
  validateAddTeamMember,
} = require('../../validators/teamValidator');

const teamController = require('../../controllers/teamController');

const router = express.Router();

router.use(auth);
router.use(tenantContext);

router.post(
  '/',
  authorize('teams:create'),
  validate(validateCreateTeam),
  teamController.createTeam
);

router.get(
  '/',
  authorize('teams:read'),
  teamController.listTeams
);

router.post(
  '/:teamId/members',
  authorize('team-members:add'),
  validate(validateAddTeamMember),
  teamController.addTeamMember
);

router.get(
  '/:teamId/members',
  authorize('team-members:read'),
  teamController.listTeamMembers
);

router.delete(
  '/:teamId/members/:membershipId',
  authorize('team-members:remove'),
  teamController.removeTeamMember
);

router.get(
  '/:teamId',
  authorize('teams:read'),
  teamController.getTeam
);

router.patch(
  '/:teamId',
  authorize('teams:update'),
  validate(validateUpdateTeam),
  teamController.updateTeam
);

router.delete(
  '/:teamId',
  authorize('teams:delete'),
  teamController.deleteTeam
);

module.exports = router;
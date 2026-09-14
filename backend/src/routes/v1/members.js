const express = require('express');
const auth = require('../../middleware/auth');
const tenantContext = require('../../middleware/tenantContext');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { updateMemberRoleSchema, updateMemberStatusSchema } = require('../../validators/memberValidator');
const controller = require('../../controllers/memberController');

const router = express.Router();
const tenant = [auth, tenantContext];

router.get('/', ...tenant, authorize('members:read'), controller.listMembers);
router.get('/:membershipId', ...tenant, authorize('members:read'), controller.getMember);
router.patch('/:membershipId/role', ...tenant, authorize('members:update'), validate(updateMemberRoleSchema), controller.updateMemberRole);
router.patch('/:membershipId/status', ...tenant, authorize('members:update'), validate(updateMemberStatusSchema), controller.updateMemberStatus);

module.exports = router;

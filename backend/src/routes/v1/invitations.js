const express = require('express');
const auth = require('../../middleware/auth');
const tenantContext = require('../../middleware/tenantContext');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { createInvitationSchema, acceptInvitationSchema } = require('../../validators/invitationValidator');
const controller = require('../../controllers/invitationController');

const router = express.Router();
const tenant = [auth, tenantContext];

router.post('/', ...tenant, authorize('members:invite'), validate(createInvitationSchema), controller.createInvitation);
router.get('/', ...tenant, authorize('members:invite'), controller.listInvitations);
router.delete('/:invitationId', ...tenant, authorize('members:invite'), controller.revokeInvitation);
router.post('/:token/accept', validate(acceptInvitationSchema), controller.acceptInvitation);

module.exports = router;

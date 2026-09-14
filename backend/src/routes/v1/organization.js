const express = require('express');
const auth = require('../../middleware/auth');
const tenantContext = require('../../middleware/tenantContext');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { updateOrganizationSchema } = require('../../validators/organizationValidator');
const { getOrganization, updateOrganization } = require('../../controllers/organizationController');

const router = express.Router();
const tenant = [auth, tenantContext];

router.get('/', ...tenant, authorize('organization:read'), getOrganization);
router.patch('/', ...tenant, authorize('organization:update'), validate(updateOrganizationSchema), updateOrganization);

module.exports = router;

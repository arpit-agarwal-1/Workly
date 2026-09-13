const express = require('express');
const auth = require('../../middleware/auth');
const tenantContext = require('../../middleware/tenantContext');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { createProjectSchema, updateProjectSchema } = require('../../validators/projectValidator');
const controller = require('../../controllers/projectController');

const router = express.Router();
const tenant = [auth, tenantContext];

router.post('/', ...tenant, authorize('projects:create'), validate(createProjectSchema), controller.createProject);
router.get('/', ...tenant, authorize('projects:read'), controller.listProjects);
router.get('/:projectId', ...tenant, authorize('projects:read'), controller.getProject);
router.patch('/:projectId', ...tenant, authorize('projects:update'), validate(updateProjectSchema), controller.updateProject);
router.delete('/:projectId', ...tenant, authorize('projects:delete'), controller.deleteProject);

module.exports = router;

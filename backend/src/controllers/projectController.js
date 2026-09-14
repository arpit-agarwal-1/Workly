const projectService = require('../services/projectService');

async function createProject(req, res, next) {
  try { return res.status(201).json({ status: 'success', data: await projectService.createProject(req.tenant.organizationId, req.body) }); }
  catch (error) { return next(error); }
}
async function listProjects(req, res, next) {
  try { return res.status(200).json({ status: 'success', data: await projectService.listProjects(req.tenant.organizationId, req.query.page, req.query.limit) }); }
  catch (error) { return next(error); }
}
async function getProject(req, res, next) {
  try { return res.status(200).json({ status: 'success', data: await projectService.getProject(req.tenant.organizationId, req.params.projectId) }); }
  catch (error) { return next(error); }
}
async function updateProject(req, res, next) {
  try { return res.status(200).json({ status: 'success', data: await projectService.updateProject(req.tenant.organizationId, req.params.projectId, req.body) }); }
  catch (error) { return next(error); }
}
async function deleteProject(req, res, next) {
  try { await projectService.deleteProject(req.tenant.organizationId, req.params.projectId); return res.status(204).send(); }
  catch (error) { return next(error); }
}
module.exports = { createProject, listProjects, getProject, updateProject, deleteProject };

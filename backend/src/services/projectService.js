const mongoose = require('mongoose');
const { Project } = require('../models');

function projectError() {
  return { statusCode: 404, code: 'PROJECT_NOT_FOUND', message: 'Project not found.' };
}

function parsePagination(page, limit) {
  const parsedPage = Number(page || 1);
  const parsedLimit = Number(limit || 20);
  if (!Number.isInteger(parsedPage) || parsedPage < 1 || !Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    const error = new Error('Invalid pagination parameters.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }
  return { page: parsedPage, limit: parsedLimit, skip: (parsedPage - 1) * parsedLimit };
}

async function createProject(organizationId, data) {
  return Project.create({ organizationId, name: data.name, description: data.description });
}

async function listProjects(organizationId, page, limit) {
  const pagination = parsePagination(page, limit);
  const filter = { organizationId };
  const [items, total] = await Promise.all([
    Project.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit).lean(),
    Project.countDocuments(filter),
  ]);
  return { items, page: pagination.page, limit: pagination.limit, total, totalPages: Math.ceil(total / pagination.limit) };
}

async function getProject(organizationId, projectId) {
  if (!mongoose.Types.ObjectId.isValid(projectId)) throw projectError();
  const project = await Project.findOne({ _id: projectId, organizationId }).lean();
  if (!project) throw projectError();
  return project;
}

async function updateProject(organizationId, projectId, data) {
  if (!mongoose.Types.ObjectId.isValid(projectId)) throw projectError();
  const project = await Project.findOneAndUpdate({ _id: projectId, organizationId }, { $set: data }, { returnDocument: 'after', runValidators: true }).lean();
  if (!project) throw projectError();
  return project;
}

async function deleteProject(organizationId, projectId) {
  if (!mongoose.Types.ObjectId.isValid(projectId)) throw projectError();
  const project = await Project.findOneAndDelete({ _id: projectId, organizationId }).lean();
  if (!project) throw projectError();
}

module.exports = { createProject, listProjects, getProject, updateProject, deleteProject };

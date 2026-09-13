const memberService = require('../services/memberService');

async function listMembers(req, res, next) {
  try { return res.status(200).json({ status: 'success', data: await memberService.listMembers(req.tenant.organizationId, req.query.page, req.query.limit) }); }
  catch (error) { return next(error); }
}
async function getMember(req, res, next) {
  try { return res.status(200).json({ status: 'success', data: await memberService.getMember(req.tenant.organizationId, req.params.membershipId) }); }
  catch (error) { return next(error); }
}
async function updateMemberRole(req, res, next) {
  try { return res.status(200).json({ status: 'success', data: await memberService.updateMemberRole(req.tenant.organizationId, req.params.membershipId, req.body.role) }); }
  catch (error) { return next(error); }
}
async function updateMemberStatus(req, res, next) {
  try { return res.status(200).json({ status: 'success', data: await memberService.updateMemberStatus(req.tenant.organizationId, req.params.membershipId, req.body.status) }); }
  catch (error) { return next(error); }
}
module.exports = { listMembers, getMember, updateMemberRole, updateMemberStatus };

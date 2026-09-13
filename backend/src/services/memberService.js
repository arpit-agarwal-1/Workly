const mongoose = require('mongoose');
const { User, Membership } = require('../models');

function memberError() {
  return { statusCode: 404, code: 'MEMBER_NOT_FOUND', message: 'Member not found.' };
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

function safeMember(member) {
  const user = member.userId;
  return {
    id: member._id,
    user: { id: user._id, name: user.name, email: user.email, status: user.status },
    role: member.role,
    status: member.status,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  };
}

async function listMembers(organizationId, page, limit) {
  const pagination = parsePagination(page, limit);
  const filter = { organizationId };
  const [members, total] = await Promise.all([
    Membership.find(filter).populate({ path: 'userId', select: 'name email status' }).sort({ createdAt: 1 }).skip(pagination.skip).limit(pagination.limit).lean(),
    Membership.countDocuments(filter),
  ]);
  return { items: members.map(safeMember), page: pagination.page, limit: pagination.limit, total, totalPages: Math.ceil(total / pagination.limit) };
}

async function getMember(organizationId, membershipId) {
  if (!mongoose.Types.ObjectId.isValid(membershipId)) throw memberError();
  const member = await Membership.findOne({ _id: membershipId, organizationId }).populate({ path: 'userId', select: 'name email status' }).lean();
  if (!member || !member.userId) throw memberError();
  return safeMember(member);
}

async function updateMemberRole(organizationId, membershipId, role) {
  if (!mongoose.Types.ObjectId.isValid(membershipId)) throw memberError();
  const member = await Membership.findOneAndUpdate({ _id: membershipId, organizationId }, { $set: { role } }, { returnDocument: 'after', runValidators: true }).populate({ path: 'userId', select: 'name email status' }).lean();
  if (!member || !member.userId) throw memberError();
  return safeMember(member);
}

async function updateMemberStatus(organizationId, membershipId, status) {
  if (!mongoose.Types.ObjectId.isValid(membershipId)) throw memberError();
  const member = await Membership.findOneAndUpdate({ _id: membershipId, organizationId }, { $set: { status } }, { returnDocument: 'after', runValidators: true }).populate({ path: 'userId', select: 'name email status' }).lean();
  if (!member || !member.userId) throw memberError();
  return safeMember(member);
}

module.exports = { listMembers, getMember, updateMemberRole, updateMemberStatus };

const ROLE_PERMISSIONS = {
  admin: [
    'organization:read',
    'organization:update',
    'members:read',
    'members:invite',
    'members:update',
    'members:remove',
    'projects:create',
    'projects:read',
    'projects:update',
    'projects:delete',
    'tasks:create',
    'tasks:read',
    'tasks:update',
    'tasks:delete',
    'teams:create',
    'teams:read',
    'teams:update',
    'teams:delete',
  ],
  manager: [
    'organization:read',
    'members:read',
    'members:update',
    'projects:create',
    'projects:read',
    'projects:update',
    'tasks:create',
    'tasks:read',
    'tasks:update',
    'teams:create',
    'teams:read',
    'teams:update',
  ],
  member: [
    'organization:read',
    'projects:read',
    'tasks:read',
    'teams:read',
  ],
};

const ALL_PERMISSIONS = [...new Set(Object.values(ROLE_PERMISSIONS).flat())];

module.exports = {
  ROLE_PERMISSIONS,
  ALL_PERMISSIONS,
};

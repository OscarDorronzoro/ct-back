import ROLES from './roles.constants';

// What a user can do. Routes ask for permissions, never for roles.
export const PERMISSIONS = Object.freeze([
  'map:read', // live map, history, weather, zones
  'cows:read', // cows, groups, breeds, categories, search
  'cows:write', // cow data (category, ear tag...), groups, breeds
  'cows:assignCollar',
  'health:read',
  'health:write', // sanitary events
  'zones:write',
  'collars:read', // collars, commands, firmwares
  'collars:write', // collars and their configuration commands
  'commands:send', // zone commands; other types need more (COMMAND_TYPE_PERMISSIONS)
  'firmware:manage', // firmware files and OTA commands
  'users:manage', // users, their roles and sessions
]);

// Permissions of each role. A user has the union of the permissions of their roles.
export const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.ADMIN]: PERMISSIONS,
  [ROLES.MANAGER]: [
    'map:read', 'cows:read', 'cows:write', 'cows:assignCollar', 'health:read',
    'zones:write', 'collars:read', 'commands:send',
  ],
  [ROLES.VETERINARIAN]: [
    'map:read', 'cows:read', 'cows:write', 'health:read', 'health:write', 'collars:read',
  ],
  [ROLES.TECHNICIAN]: [
    'map:read', 'cows:read', 'cows:assignCollar', 'collars:read', 'collars:write',
    'commands:send', 'firmware:manage',
  ],
  [ROLES.VIEWER]: ['map:read', 'cows:read', 'health:read', 'collars:read'],
});

// Besides commands:send: zone commands are herd management, the rest configure the device
export const COMMAND_TYPE_PERMISSIONS = Object.freeze({
  zone: null,
  zoneClear: null,
  params: 'collars:write',
  resetParams: 'collars:write',
  diag: 'collars:write',
  reboot: 'collars:write',
  ota: 'firmware:manage',
  otaCancel: 'firmware:manage',
});

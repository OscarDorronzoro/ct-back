import { PERMISSIONS, ROLE_PERMISSIONS, COMMAND_TYPE_PERMISSIONS } from './permission.constants';

// Union of the permissions of the roles, in PERMISSIONS order. Unknown roles add nothing.
export function permissionsOf(roles) {
  const granted = new Set(roles.flatMap((role) => ROLE_PERMISSIONS[role] ?? []));

  return PERMISSIONS.filter((permission) => granted.has(permission));
}

// Fails on start up if a route asks for a permission that doesn't exist (a typo)
export function assertPermission(permission) {
  if (!PERMISSIONS.includes(permission)) {
    throw new Error(`Unknown permission: ${permission}`);
  }
}

// Permission a user lacks to send a command of this type, or null
export function missingCommandPermission(type, permissions) {
  const required = ['commands:send', COMMAND_TYPE_PERMISSIONS[type]].filter(Boolean);

  return required.find((permission) => !permissions.includes(permission)) ?? null;
}

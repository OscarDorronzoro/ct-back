import { assertPermission } from './permission.util';

function forbidden(res, missing) {
  return res.status(403)
    .json({ error: 'FORBIDDEN', message: `Missing permission: ${missing.join(' or ')}` });
}

// The user needs this permission (after authenticateUser)
export default function authorize(permission) {
  assertPermission(permission);

  return (req, res, next) => (req.user.permissions.includes(permission)
    ? next()
    : forbidden(res, [permission]));
}

// The user needs at least one of them; the handler checks the rest (e.g. which fields they change)
export function authorizeAny(...permissions) {
  permissions.forEach(assertPermission);

  return (req, res, next) => (permissions.some((p) => req.user.permissions.includes(p))
    ? next()
    : forbidden(res, permissions));
}

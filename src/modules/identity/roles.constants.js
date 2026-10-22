// Roles of a user (a user can have several; see permission.constants for what each one can do)
const ROLES = Object.freeze({
  ADMIN: 'admin',
  MANAGER: 'manager',
  VETERINARIAN: 'veterinarian',
  TECHNICIAN: 'technician',
  VIEWER: 'viewer',
});

export default ROLES;

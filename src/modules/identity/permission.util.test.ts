import { describe, it, expect } from 'vitest';

import { permissionsOf, assertPermission, missingCommandPermission } from './permission.util';
import { PERMISSIONS, ROLE_PERMISSIONS, COMMAND_TYPE_PERMISSIONS } from './permission.constants';
import ROLES from './roles.constants';

describe('permission matrix', () => {
  it('defines every role, with known permissions only', () => {
    expect(Object.keys(ROLE_PERMISSIONS).sort()).toEqual(Object.values(ROLES).sort());

    Object.values(ROLE_PERMISSIONS).flat().forEach((permission) => {
      expect(PERMISSIONS).toContain(permission);
    });
  });

  it('gives admin every permission, and users:manage to nobody else', () => {
    expect(permissionsOf([ROLES.ADMIN])).toEqual(PERMISSIONS);

    Object.values(ROLES).filter((role) => role !== ROLES.ADMIN).forEach((role) => {
      expect(permissionsOf([role])).not.toContain('users:manage');
    });
  });

  it('lets every role read the map and the cows', () => {
    Object.values(ROLES).forEach((role) => {
      expect(permissionsOf([role])).toEqual(expect.arrayContaining(['map:read', 'cows:read']));
    });
  });

  it('asks only for known permissions for each command type', () => {
    Object.values(COMMAND_TYPE_PERMISSIONS).filter(Boolean).forEach((permission) => {
      expect(PERMISSIONS).toContain(permission);
    });
  });
});

describe('permissionsOf', () => {
  it('joins the permissions of several roles, without duplicates', () => {
    const permissions = permissionsOf([ROLES.MANAGER, ROLES.VETERINARIAN, ROLES.TECHNICIAN]);

    expect(permissions).toEqual(PERMISSIONS.filter((p) => p !== 'users:manage'));
  });

  it('ignores unknown roles', () => {
    expect(permissionsOf(['owner'])).toEqual([]);
    expect(permissionsOf([])).toEqual([]);
  });
});

describe('assertPermission', () => {
  it('fails on an unknown permission (a typo in a route)', () => {
    expect(() => assertPermission('cow:write')).toThrow('Unknown permission');
    expect(() => assertPermission('cows:write')).not.toThrow();
  });
});

describe('missingCommandPermission', () => {
  const manager = permissionsOf([ROLES.MANAGER]);
  const technician = permissionsOf([ROLES.TECHNICIAN]);

  it('lets a manager send zone commands only', () => {
    expect(missingCommandPermission('zone', manager)).toBeNull();
    expect(missingCommandPermission('zoneClear', manager)).toBeNull();
    expect(missingCommandPermission('params', manager)).toBe('collars:write');
    expect(missingCommandPermission('ota', manager)).toBe('firmware:manage');
  });

  it('lets a technician send any command', () => {
    Object.keys(COMMAND_TYPE_PERMISSIONS).forEach((type) => {
      expect(missingCommandPermission(type, technician)).toBeNull();
    });
  });

  it('needs commands:send first', () => {
    expect(missingCommandPermission('zone', permissionsOf([ROLES.VETERINARIAN]))).toBe('commands:send');
  });
});

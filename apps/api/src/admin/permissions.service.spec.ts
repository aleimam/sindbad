import { describe, expect, it } from 'vitest';
import { PermissionsService } from './permissions.service';

describe('PermissionsService.resolve', () => {
  it('unions team permissions', () => {
    const set = PermissionsService.resolve(['users.read', 'trips.approve', 'users.read'], []);
    expect(set).toEqual(new Set(['users.read', 'trips.approve']));
  });

  it('member allow-grants add', () => {
    const set = PermissionsService.resolve(['users.read'], [
      { permission: 'finance.ledger', allow: true },
    ]);
    expect(set.has('finance.ledger')).toBe(true);
  });

  it('member denials win over team grants', () => {
    const set = PermissionsService.resolve(['users.read', 'users.block'], [
      { permission: 'users.block', allow: false },
    ]);
    expect(set.has('users.block')).toBe(false);
    expect(set.has('users.read')).toBe(true);
  });
});

describe('PermissionsService.has', () => {
  const base = { isStaff: true, isSuperAdmin: false, permissions: new Set(['users.read']) };

  it('non-staff never passes', () => {
    expect(PermissionsService.has({ ...base, isStaff: false }, ['users.read'])).toBe(false);
  });

  it('super admin bypasses', () => {
    expect(
      PermissionsService.has(
        { isStaff: true, isSuperAdmin: true, permissions: new Set() },
        ['finance.ledger'],
      ),
    ).toBe(true);
  });

  it('requires every requested key', () => {
    expect(PermissionsService.has(base, ['users.read'])).toBe(true);
    expect(PermissionsService.has(base, ['users.read', 'users.write'])).toBe(false);
  });
});

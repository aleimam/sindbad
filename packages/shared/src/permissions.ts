/**
 * The staff permission catalog — granular per admin module (docs/03 §2).
 * Stored as string keys on TeamPermission / StaffPermission rows.
 */
export const PERMISSIONS = [
  'dashboard.view',
  // Users & KYC
  'users.read',
  'users.write',
  'users.block',
  'verifications.review',
  'editApprovals.review',
  'commercialApprovals.review',
  // Marketplace
  'trips.read',
  'trips.approve',
  'shipments.read',
  'deals.read',
  'deals.intervene',
  'reviews.moderate',
  // Finance
  'finance.deposits',
  'finance.withdrawals',
  'finance.ledger',
  'finance.adjustments',
  'finance.fx',
  'finance.gateways',
  // Support
  'complaints.handle',
  'chat.monitor',
  'notifications.send',
  // Pricing & fees
  'pricing.edit',
  'pricing.smart.approve',
  // Catalogs & settings
  'catalogs.edit',
  'pages.edit',
  'settings.edit',
  // Administration
  'staff.manage',
  'teams.manage',
  'permissions.manage',
  'audit.view',
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number];

export function isPermissionKey(value: string): value is PermissionKey {
  return (PERMISSIONS as readonly string[]).includes(value);
}

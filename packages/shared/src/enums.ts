// Core domain enums — the single source is docs/02-domain-blueprint.md

export const AccountType = { Personal: 'PERSONAL', Commercial: 'COMMERCIAL' } as const;
export type AccountType = (typeof AccountType)[keyof typeof AccountType];

export const AccountRole = { Owner: 'OWNER', Manager: 'MANAGER' } as const;
export type AccountRole = (typeof AccountRole)[keyof typeof AccountRole];

export const MissionKind = { Trip: 'TRIP', Shipment: 'SHIPMENT' } as const;
export type MissionKind = (typeof MissionKind)[keyof typeof MissionKind];

export const ShipmentType = { Box: 'BOX', Basket: 'BASKET' } as const;
export type ShipmentType = (typeof ShipmentType)[keyof typeof ShipmentType];

export const PricingMode = { Fixed: 'FIXED', Variable: 'VARIABLE' } as const;
export type PricingMode = (typeof PricingMode)[keyof typeof PricingMode];

export const DealStatus = {
  Requested: 'REQUESTED',
  Negotiating: 'NEGOTIATING',
  Ongoing: 'ONGOING',
  ArrivedDestination: 'ARRIVED_DESTINATION',
  ReadyForPickup: 'READY_FOR_PICKUP',
  Completed: 'COMPLETED',
  Cancelled: 'CANCELLED',
} as const;
export type DealStatus = (typeof DealStatus)[keyof typeof DealStatus];

export const MissionStatus = {
  Draft: 'DRAFT',
  PendingApproval: 'PENDING_APPROVAL',
  Active: 'ACTIVE',
  Rejected: 'REJECTED',
  Expired: 'EXPIRED',
  Closed: 'CLOSED',
} as const;
export type MissionStatus = (typeof MissionStatus)[keyof typeof MissionStatus];

export const OngoingStep = {
  Ordered: 'ORDERED',
  Shipped: 'SHIPPED',
  DeliveredToTraveler: 'DELIVERED_TO_TRAVELER',
  ReceivedByTraveler: 'RECEIVED_BY_TRAVELER',
} as const;
export type OngoingStep = (typeof OngoingStep)[keyof typeof OngoingStep];

export const PaymentMethod = { Cash: 'CASH', InApp: 'IN_APP' } as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const Currency = { USD: 'USD', EGP: 'EGP' } as const;
export type Currency = (typeof Currency)[keyof typeof Currency];

export const VerificationStatus = {
  New: 'NEW',
  Studying: 'STUDYING',
  Verified: 'VERIFIED',
  NeedsReview: 'NEEDS_REVIEW',
  Rejected: 'REJECTED',
} as const;
export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus];

export const CredibilityTier = {
  New: 'NEW',
  Bronze: 'BRONZE',
  Silver: 'SILVER',
  Gold: 'GOLD',
  Platinum: 'PLATINUM',
} as const;
export type CredibilityTier = (typeof CredibilityTier)[keyof typeof CredibilityTier];

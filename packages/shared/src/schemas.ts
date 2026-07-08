import { z } from 'zod';

// Registration: email OR phone (at least one) + password — see docs/02 & 03.
export const registerSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().min(6).optional(),
    password: z.string().min(8),
  })
  .refine((v) => Boolean(v.email || v.phone), {
    message: 'Provide an email or a phone number',
    path: ['email'],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  identifier: z.string().min(3), // email or phone
  password: z.string().min(8),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const verifyOtpSchema = z.object({
  challengeId: z.string().min(1),
  code: z
    .string()
    .length(6)
    .regex(/^\d{6}$/),
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(), // falls back to the httpOnly cookie
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export const forgotPasswordSchema = z.object({
  identifier: z.string().min(3),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  challengeId: z.string().min(1),
  code: z
    .string()
    .length(6)
    .regex(/^\d{6}$/),
  newPassword: z.string().min(8),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ── Admin ──

export const verify2faSchema = z.object({
  challengeToken: z.string().min(1),
  code: z
    .string()
    .length(6)
    .regex(/^\d{6}$/),
});
export type Verify2faInput = z.infer<typeof verify2faSchema>;

export const enable2faSchema = z.object({
  code: z
    .string()
    .length(6)
    .regex(/^\d{6}$/),
});
export type Enable2faInput = z.infer<typeof enable2faSchema>;

export const teamUpsertSchema = z.object({
  name: z.string().min(2).max(60),
});
export type TeamUpsertInput = z.infer<typeof teamUpsertSchema>;

export const teamPermissionsSchema = z.object({
  permissions: z.array(z.string().min(1)),
});
export type TeamPermissionsInput = z.infer<typeof teamPermissionsSchema>;

export const teamMemberSchema = z.object({
  userId: z.string().min(1),
});
export type TeamMemberInput = z.infer<typeof teamMemberSchema>;

export const staffPermissionsSchema = z.object({
  grants: z.array(
    z.object({
      permission: z.string().min(1),
      allow: z.boolean(),
    }),
  ),
});
export type StaffPermissionsInput = z.infer<typeof staffPermissionsSchema>;

// ── Missions ──

export const createTripSchema = z
  .object({
    originCountryId: z.string().min(1),
    destinationCountryId: z.string().min(1),
    receivingStart: z.coerce.date().optional(), // optional → open ("shoppers can ship now")
    receivingEnd: z.coerce.date(),
    tripDate: z.coerce.date(), // private — never shown to other users
    deliveryDate: z.coerce.date(),
    deliveryLocation: z.string().min(2).max(120), // city/neighbourhood — public
    receivingAddress: z.string().min(5).max(500), // private until deal dual-agreed
    travelerCount: z.number().int().min(1).max(20).default(1),
    availableWeightKg: z.number().positive().max(1000),
    feeUsd: z.number().int().min(0).optional(), // minor units (cents)
    notes: z.string().max(2000).optional(),
    allowedCategoryIds: z.array(z.string().min(1)).min(1),
    isCyclic: z.boolean().default(false),
  })
  .refine((v) => !v.receivingStart || v.receivingStart <= v.receivingEnd, {
    message: 'Receiving start must be before receiving end',
    path: ['receivingStart'],
  })
  .refine((v) => v.receivingEnd <= v.tripDate, {
    message: 'Receiving window must close before the trip date',
    path: ['receivingEnd'],
  })
  .refine((v) => v.tripDate <= v.deliveryDate, {
    message: 'Delivery date must be after the trip date',
    path: ['deliveryDate'],
  });
export type CreateTripInput = z.infer<typeof createTripSchema>;

export const shipmentItemSchema = z.object({
  details: z.string().min(2).max(500),
  url: z.string().url().optional(),
  volumetricWeightKg: z.number().positive().max(1000),
  count: z.number().int().min(1).max(1000).default(1),
  categoryId: z.string().min(1),
  declaredValueUsd: z.number().int().min(0).optional(), // minor units
  notes: z.string().max(1000).optional(),
});
export type ShipmentItemInput = z.infer<typeof shipmentItemSchema>;

export const createShipmentSchema = z.object({
  originCountryId: z.string().min(1),
  destinationCountryId: z.string().min(1),
  type: z.enum(['BOX', 'BASKET']),
  feeUsd: z.number().int().min(0).optional(),
  notes: z.string().max(2000).optional(),
  isCyclic: z.boolean().default(false),
  items: z.array(shipmentItemSchema).min(1).max(50),
});
export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;

// ── Deals ──

export const requestDealSchema = z.object({
  tripMissionId: z.string().min(1),
  shipmentMissionId: z.string().min(1),
  feeUsd: z.number().int().min(0).optional(), // defaults to the shipment/trip asking fee
  paymentMethod: z.enum(['CASH', 'IN_APP']).default('CASH'),
});
export type RequestDealInput = z.infer<typeof requestDealSchema>;

export const changeFeeSchema = z.object({
  feeUsd: z.number().int().min(0),
});
export type ChangeFeeInput = z.infer<typeof changeFeeSchema>;

export const cancelDealSchema = z.object({
  reason: z.string().max(1000).optional(),
});
export type CancelDealInput = z.infer<typeof cancelDealSchema>;

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
    askCategoryIds: z.array(z.string().min(1)).default([]), // match, but flag for confirmation
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
  pricingMode: z.enum(['FIXED', 'VARIABLE']).optional(), // BASKET only (decision L2)
});
export type RequestDealInput = z.infer<typeof requestDealSchema>;

export const actualPriceSchema = z.object({
  amountMinor: z.number().int().min(0),
});
export type ActualPriceInput = z.infer<typeof actualPriceSchema>;

export const changeFeeSchema = z.object({
  feeUsd: z.number().int().min(0),
});
export type ChangeFeeInput = z.infer<typeof changeFeeSchema>;

export const cancelDealSchema = z.object({
  reason: z.string().max(1000).optional(),
});
export type CancelDealInput = z.infer<typeof cancelDealSchema>;

export const updateTripSchema = z.object({
  // Free edits (spec): categories, weight, notes, addresses, fee, travelers.
  allowedCategoryIds: z.array(z.string().min(1)).min(1).optional(),
  askCategoryIds: z.array(z.string().min(1)).optional(),
  availableWeightKg: z.number().positive().max(1000).optional(),
  notes: z.string().max(2000).nullable().optional(),
  receivingAddress: z.string().min(5).max(500).optional(),
  deliveryLocation: z.string().min(2).max(120).optional(),
  feeUsd: z.number().int().min(0).nullable().optional(),
  travelerCount: z.number().int().min(1).max(20).optional(),
  // Approval-gated on active trips (Edit Approvals):
  receivingStart: z.coerce.date().nullable().optional(),
  receivingEnd: z.coerce.date().optional(),
  tripDate: z.coerce.date().optional(),
  // Direct only while the trip has no accepted deals:
  deliveryDate: z.coerce.date().optional(),
});
export type UpdateTripInput = z.infer<typeof updateTripSchema>;

export const updateShipmentSchema = z.object({
  type: z.enum(['BOX', 'BASKET']).optional(),
  feeUsd: z.number().int().min(0).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  items: z.array(shipmentItemSchema).min(1).max(50).optional(), // full replacement
});
export type UpdateShipmentInput = z.infer<typeof updateShipmentSchema>;

export const partiallyFlagSchema = z.object({
  problem: z.enum(['LOST_DAMAGED', 'DELAYED']),
});
export type PartiallyFlagInput = z.infer<typeof partiallyFlagSchema>;

export const resolutionSchema = z.object({
  text: z.string().min(3).max(2000),
});
export type ResolutionInput = z.infer<typeof resolutionSchema>;

// ── Money ──

export const feeEstimateSchema = z.object({
  originCountryId: z.string().min(1),
  destinationCountryId: z.string().min(1),
  type: z.enum(['BOX', 'BASKET']),
  items: z
    .array(
      z.object({
        categoryId: z.string().min(1),
        volumetricWeightKg: z.number().positive().max(1000),
        count: z.number().int().min(1).max(1000).default(1),
      }),
    )
    .min(1)
    .max(50),
});
export type FeeEstimateInput = z.infer<typeof feeEstimateSchema>;

export const adminAdjustSchema = z.object({
  accountId: z.string().min(1),
  currency: z.enum(['USD', 'EGP']),
  amountMinor: z.number().int().refine((v) => v !== 0, 'Amount cannot be zero'),
  note: z.string().min(3).max(500),
});
export type AdminAdjustInput = z.infer<typeof adminAdjustSchema>;

export const feeConfigSchema = z.object({
  basketMultiplier: z.number().positive().max(10),
  weightUsdPerKg: z.number().int().min(0),
  floorFeeUsd: z.number().int().min(0),
});
export type FeeConfigInput = z.infer<typeof feeConfigSchema>;

export const createDepositSchema = z.object({
  currency: z.enum(['USD', 'EGP']),
  amountMinor: z.number().int().positive(),
  method: z.enum(['INSTAPAY', 'BANK_TRANSFER']),
});
export type CreateDepositInput = z.infer<typeof createDepositSchema>;

export const submitDepositSchema = z.object({
  userReference: z.string().min(2).max(120),
});
export type SubmitDepositInput = z.infer<typeof submitDepositSchema>;

export const bankAccountSchema = z.object({
  holderName: z.string().min(2).max(120),
  country: z.string().min(2).max(80),
  bankName: z.string().min(2).max(120),
  accountNumber: z.string().min(4).max(60),
  iban: z.string().max(40).optional(),
  routingNumber: z.string().max(20).optional(),
  swift: z.string().max(15).optional(),
  holderAddress: z.string().max(300).optional(),
});
export type BankAccountInput = z.infer<typeof bankAccountSchema>;

export const withdrawalSchema = z.object({
  bankAccountId: z.string().min(1),
  currency: z.enum(['USD', 'EGP']),
  amountMinor: z.number().int().positive(),
});
export type WithdrawalInput = z.infer<typeof withdrawalSchema>;

export const transferInitiateSchema = z.object({
  recipient: z.string().min(3).max(120), // email, phone, or exact display name
  currency: z.enum(['USD', 'EGP']),
  amountMinor: z.number().int().positive(),
});
export type TransferInitiateInput = z.infer<typeof transferInitiateSchema>;

export const transferConfirmSchema = z.object({
  transferId: z.string().min(1),
  code: z
    .string()
    .length(6)
    .regex(/^\d{6}$/),
});
export type TransferConfirmInput = z.infer<typeof transferConfirmSchema>;

export const fxManualRateSchema = z.object({
  usdToEgp: z.number().positive(),
});
export type FxManualRateInput = z.infer<typeof fxManualRateSchema>;

export const categoryPreferencesSchema = z.object({
  items: z.array(
    z.object({
      categoryId: z.string().min(1),
      stance: z.enum(['ACCEPT', 'REJECT', 'ASK']),
    }),
  ),
});
export type CategoryPreferencesInput = z.infer<typeof categoryPreferencesSchema>;

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

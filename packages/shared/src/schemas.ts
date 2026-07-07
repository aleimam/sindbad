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

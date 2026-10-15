import { z } from 'zod';

// Keep in sync with backend/src/common/validation.constants.ts
const NAME_MIN_LENGTH = 3;
const NAME_MAX_LENGTH = 100;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address'));

export const signUpSchema = z.object({
  email,
  name: z
    .string()
    .trim()
    .min(NAME_MIN_LENGTH, `Name must be at least ${NAME_MIN_LENGTH} characters`)
    .max(NAME_MAX_LENGTH, `Name must be at most ${NAME_MAX_LENGTH} characters`),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters`)
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[^A-Za-z\d]/, 'Password must contain at least one special character'),
});

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(PASSWORD_MAX_LENGTH),
});

export type SignUpValues = z.infer<typeof signUpSchema>;
export type SignInValues = z.infer<typeof signInSchema>;

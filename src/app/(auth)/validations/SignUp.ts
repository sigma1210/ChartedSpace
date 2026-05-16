import { z } from "zod"

export const signUpSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be at most 100 characters")
    .nonempty("Password is required"),
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name must be at most 50 characters"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name must be at most 50 characters"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username may only contain letters, numbers, underscores, or hyphens"),
  birthMonth: z.string().min(1, "Month is required"),
  birthDay: z.string().min(1, "Day is required"),
  birthYear: z.string().min(4, "Year is required"),
})

export type SignUpType = z.infer<typeof signUpSchema>

export const emailVerificationSchema = z.object({
  code: z
    .string()
    .nonempty("Verification code is required")
    .regex(/^\d+$/, "Code must contain digits only"),
})

export type EmailVerificationType = z.infer<typeof emailVerificationSchema>

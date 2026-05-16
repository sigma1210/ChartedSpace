import { z } from "zod"

export const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be at most 100 characters")
    .nonempty("Password is required"),
})

export type SignInType = z.infer<typeof signInSchema>

export const verificationCodeSchema = z.object({
  code: z
    .string()
    .nonempty("Verification code is required")
    .regex(/^\d+$/, "Code must contain digits only"),
})

export type VerificationCodeType = z.infer<typeof verificationCodeSchema>
